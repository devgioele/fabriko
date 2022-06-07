import type {
  MapboxAxiosConfig,
  MapboxTileset,
  MapboxToken,
  MapboxUploadStatus,
  S3Creds,
  Tileset
} from '../types/mapbox'
import { axiosAuthConfig } from './base'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import HttpStatusCode from '../lib/httpStatusCode'
import { uploadFileToS3 } from './aws'
import type { PollingProcessor } from '../types/polling'
import { progressPolling } from '../lib/polling'
import { isEqual, merge } from 'lodash'
import * as core from '@actions/core'
import { nanos } from '../lib/common'

const userScopes = ['styles:tiles', 'styles:read', 'fonts:read']

const userAllowedUrls = ['https://api.mapbox.com', 'https://events.mapbox.com']

const axiosConfig = (
  { jwt, cache = true }: MapboxAxiosConfig,
  otherConfig?: AxiosRequestConfig
): AxiosRequestConfig => {
  const config: AxiosRequestConfig = { params: {} }
  if (jwt) {
    config.params.access_token = jwt
  }
  /* Append a timestamp parameter to the response from being cached.
  Setting headers like `Cache-Control` and `Pragma` would not always work.
  */
  if (!cache) {
    config.params.timestamp = nanos()
  }
  return merge(config, otherConfig)
}

/** Takes the first public access token from the given Mapbox account.
 * @see https://docs.mapbox.com/api/accounts/tokens/#list-tokens */
const fetchPublicAccessToken = async (
  username: string,
  adminAccessToken: string
): Promise<MapboxToken | undefined> => {
  const { data } = await axios.get<MapboxToken[]>(
    `https://api.mapbox.com/tokens/v2/${username}`,
    axiosConfig({ jwt: adminAccessToken })
  )
  const tokens = data
  // Take the first non-default public token
  return tokens.find(t => !t.default && t.usage === 'pk')
}

/**
 * @see https://docs.mapbox.com/api/accounts/tokens/#create-a-token
 */
export const createUserAccessToken = async (
  username: string,
  adminAccessToken: string
): Promise<MapboxToken> => {
  const requestBody = {
    note: `Public token for ${username}`,
    scopes: userScopes,
    allowedUrls: userAllowedUrls
  }
  const { status, data: token } = await axios.post<MapboxToken>(
    `https://api.mapbox.com/tokens/v2/${username}`,
    requestBody,
    axiosConfig({ jwt: adminAccessToken })
  )
  if (status !== HttpStatusCode.CREATED) {
    throw new Error(
      `Could not create public token for Mapbox account '${username}'.`
    )
  }
  // If the generated token does not have the expected permission
  if (
    !isEqual(token.scopes, userScopes) ||
    !isEqual(token.allowedUrls, userAllowedUrls)
  ) {
    throw new Error(
      'The just created token does not have the expected permission!'
    )
  }
  return token
}

export const fetchUserAccessToken = async (
  username: string,
  adminAccessToken: string
): Promise<{ token: string; id: string }> => {
  let token = await fetchPublicAccessToken(username, adminAccessToken)
  if (!token) {
    token = await createUserAccessToken(username, adminAccessToken)
  }
  return token
}

/** @see https://docs.mapbox.com/api/maps/uploads/#retrieve-s3-credentials */
const getS3Creds = async (
  username: string,
  adminAccessToken: string
): Promise<S3Creds> => {
  core.debug(`Retrieving credentials for a AWS S3 bucket`)
  const { data } = await axios.get<S3Creds>(
    `https://api.mapbox.com/uploads/v1/${username}/credentials`,
    axiosConfig({ jwt: adminAccessToken, cache: false })
  )
  return data
}

/** Tells Mapbox to start the generation of the tileset and returns the
 * upload ID.
 * 'Upload' refers to the transfer from the AWS S3 Bucket to Mapbox's server and its conversion into a tileset.
 * @see https://docs.mapbox.com/api/maps/uploads/#create-an-upload */
const triggerTilesetGeneration = async (
  username: string,
  adminAccessToken: string,
  tilesetName: string,
  tilesetId: string,
  s3ObjectUrl: string
): Promise<string> => {
  const requestBody = {
    name: tilesetName,
    tileset: tilesetId,
    url: s3ObjectUrl
  }
  const { status, data: uploadStatus } = await axios.post<MapboxUploadStatus>(
    `https://api.mapbox.com/uploads/v1/${username}`,
    requestBody,
    axiosConfig(
      { jwt: adminAccessToken },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  )
  if (status !== HttpStatusCode.CREATED) {
    throw new Error(
      `Could not trigger the generation of the tileset '${tilesetName}' with ID '${tilesetId}'.`
    )
  }
  return uploadStatus.id
}

/** Retrieves the upload status by polling.
 * @see https://docs.mapbox.com/api/maps/uploads/#retrieve-upload-status */
const uploadIsComplete = async (
  uploadId: string,
  tilesetName: string,
  username: string,
  adminAccessToken: string
): Promise<void> => {
  const statusFetcher = async (): Promise<MapboxUploadStatus> => {
    const { data } = await axios.get<MapboxUploadStatus>(
      `https://api.mapbox.com/uploads/v1/${username}/${uploadId}`,
      axiosConfig({ jwt: adminAccessToken, cache: false })
    )
    return data
  }
  let lastProgress = -1
  const processor: PollingProcessor<MapboxUploadStatus> = status => {
    if (status.error) {
      throw new Error(`Mapbox upload failed with error:\n${status.error}`)
    } else if (status.progress === undefined) {
      return -1
    } else {
      const newProgress = Math.round(status.progress * 100)
      if (newProgress !== lastProgress) {
        lastProgress = newProgress
        core.info(`[${tilesetName}] ${newProgress}%`)
      }
      return status.progress
    }
  }
  await progressPolling(statusFetcher, processor, {
    attempts: 2,
    interval: 4000
  })
}

export const upload = async (
  filePath: string,
  tilesetName: string,
  tilesetId: string,
  username: string,
  adminAccessToken: string
): Promise<Tileset> => {
  const s3Creds = await getS3Creds(username, adminAccessToken)
  core.debug(`Uploading tileset '${tilesetName}' to the AWS S3 bucket...`)
  await uploadFileToS3(filePath, s3Creds)

  core.debug(
    `Telling Mapbox to generate tileset '${tilesetName}' with ID '${tilesetId}'...`
  )
  const s3ObjectUrl = `https://${s3Creds.bucket}.s3.amazonaws.com/${s3Creds.key}`
  const uploadId = await triggerTilesetGeneration(
    username,
    adminAccessToken,
    tilesetName,
    tilesetId,
    s3ObjectUrl
  )

  core.debug(`Waiting until the upload is complete...`)
  await uploadIsComplete(uploadId, tilesetName, username, adminAccessToken)
  return {
    id: tilesetId,
    name: tilesetName
  }
}

/**
 * @see https://docs.mapbox.com/api/maps/mapbox-tiling-service/#delete-tileset
 */
export const deleteTilesets = async (
  tilesets: Tileset[],
  adminAccessToken: string
): Promise<void> => {
  for (const tileset of tilesets) {
    const response = await axios.delete(
      `https://api.mapbox.com/tilesets/v1/${tileset.id}`,
      axiosConfig({ jwt: adminAccessToken })
    )
    // If unsuccessful
    if (response.status !== HttpStatusCode.OK) {
      throw new Error(`Unexpected response: ${response.status}`)
    }
  }
}

/** Returns the names of the uploaded tilesets. */
export const getUploadedTilesets = async (
  username: string,
  adminAccessToken: string
): Promise<Tileset[]> => {
  const { data: tilesets } = await axios.get<MapboxTileset[]>(
    `https://api.mapbox.com/tilesets/v1/${username}`,
    axiosConfig({ jwt: adminAccessToken })
  )
  return tilesets.map(tileset => ({ name: tileset.name, id: tileset.id }))
}

/**
 * @see https://docs.mapbox.com/api/accounts/tokens/#delete-a-token
 */
export const deleteUserAccessToken = async (
  username: string,
  tokenId: string,
  adminAccessToken: string
): Promise<void> => {
  const response = await axios.delete(
    `https://api.mapbox.com/tokens/v2/${username}/${tokenId}`,
    axiosAuthConfig(adminAccessToken)
  )
  // If unsuccessful
  if (response.status !== HttpStatusCode.NO_CONTENT) {
    throw new Error(`Unexpected response: ${response.status}`)
  }
}
