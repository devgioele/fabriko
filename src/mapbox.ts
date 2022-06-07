import * as core from '@actions/core'
import path from 'path'
import type {
  GisFileConfig,
  GisFilesConfig,
  MapboxAccountConfig
} from './types/input'
import type { MapboxAccess, Tileset, Tilesets } from './types/mapbox'
import {
  createUserAccessToken,
  deleteTilesets,
  deleteUserAccessToken,
  fetchUserAccessToken,
  getUploadedTilesets,
  upload
} from './api/mapbox'
import { getSuffix, addSuffix, collectResultsWithCleanup } from './lib/common'
import type { GisFiles } from './types/gisFiles'
import type { ResultWithCleanup } from './types/common'

const suffixSeparator = '-'

const getVersion = (tilesetName: string): number | undefined => {
  const suffix = getSuffix(tilesetName, suffixSeparator)
  return suffix ? parseInt(suffix) : undefined
}

const addVersion = (name: string, version: number): string =>
  addSuffix(name, version, suffixSeparator)

const getHighestVersion = (tilesets: Tileset[]): number => {
  let highestVersion = 1
  for (const tileset of tilesets) {
    const version = getVersion(tileset.name)
    if (version && version > highestVersion) {
      highestVersion = version
    }
  }
  return highestVersion
}

/** Generates a tileset ID that matches Mapbox's criteria:
 * - starts with `username.`
 * - is not longer than the length of the username plus 32 characters
 * - consists only of alphanumeric characters and the characters `-` and `_`
 * @see https://docs.mapbox.com/api/maps/uploads/#create-an-upload.
 */
const toTilesetId = (tilesetName: string, username: string): string => {
  const shortened = tilesetName.substring(0, 31)
  const sanitized = shortened.replace(/[^\w_]/, '-')
  return `${username}.${sanitized}`
}

export class MapboxAccount {
  private username: string
  private groupsRegex: string
  private gisFiles: GisFiles
  private adminAccessToken: string
  private userAccessToken: string
  private userAccessTokenId: string

  static async build(account: MapboxAccountConfig): Promise<MapboxAccount> {
    const userAccessToken = await fetchUserAccessToken(
      account.username,
      account.adminAccessToken
    )
    return new MapboxAccount(
      account.username,
      account.groupsRegex,
      account.gisFiles,
      account.adminAccessToken,
      userAccessToken.token,
      userAccessToken.id
    )
  }

  constructor(
    username: string,
    groupsRegex: string,
    gisFiles: GisFiles,
    adminAccessToken: string,
    userAccessToken: string,
    userAccessTokenId: string
  ) {
    this.username = username
    this.groupsRegex = groupsRegex
    this.gisFiles = gisFiles
    this.adminAccessToken = adminAccessToken
    this.userAccessToken = userAccessToken
    this.userAccessTokenId = userAccessTokenId
  }

  private logInfo(message: string): void {
    core.info(`[${this.username}] ${message}`)
  }

  private logDebug(message: string): void {
    core.debug(`[${this.username}] ${message}`)
  }

  private uploadFiles = async (
    files: GisFileConfig[],
    version: number
  ): Promise<Tileset[]> => {
    const uploads = files.map(async file => {
      const tilesetName = path.parse(file.path).name
      const versionedTilesetName = addVersion(tilesetName, version)
      const tilesetId = toTilesetId(versionedTilesetName, this.username)
      return upload(
        file.path,
        versionedTilesetName,
        tilesetId,
        this.username,
        this.adminAccessToken
      )
    })
    // Start uploads concurrently
    return await Promise.all(uploads)
  }

  private async getUploadedTilesets(): Promise<
    [uploadedTilesets: Tileset[], currentVersion: number]
  > {
    this.logInfo('Fetching uploaded tilesets...')
    const uploadedTilesets = await getUploadedTilesets(
      this.username,
      this.adminAccessToken
    )
    const highestVersion = getHighestVersion(uploadedTilesets)
    return [uploadedTilesets, highestVersion]
  }

  private async deleteOldTilesets(
    uploadedTilesets: Tileset[],
    oldVersion: number
  ): Promise<void> {
    const oldTilesets = uploadedTilesets.filter(tileset => {
      const version = getVersion(tileset.name)
      // Delete tilesets if they don't have a version number
      // or have an old version number
      if (!version) {
        return true
      }
      return version <= oldVersion
    })
    await deleteTilesets(oldTilesets, this.adminAccessToken)
  }

  /** Uses the given file names to find the files from the list of GIS files. */
  private filesSubset(
    filesSubsetNames: string[],
    filesSuperset: GisFileConfig[]
  ): GisFileConfig[] {
    return filesSubsetNames.flatMap(fileSubsetName => {
      const foundFiles = filesSuperset.filter(
        fileSuperset => fileSuperset.name === fileSubsetName
      )
      if (foundFiles.length === 0) {
        throw new Error(
          `File '${fileSubsetName}' not found for Mapbox account '${this.username}'.`
        )
      }
      return foundFiles
    })
  }

  /** Returns a subset of the given GIS files that belong to this Mapbox
   * account.
   */
  private myFiles(files: GisFilesConfig): GisFilesConfig {
    const rasterSubset = this.filesSubset(this.gisFiles.raster, files.raster)
    const vectorSubset = this.filesSubset(this.gisFiles.vector, files.vector)
    // Discard vector files that do not match the group regex of this account.
    vectorSubset.filter(file => {
      const fileName = path.parse(file.path).name
      return !!fileName.match(this.groupsRegex)
    })
    return {
      raster: rasterSubset,
      vector: vectorSubset
    }
  }

  /** Uploads the given GIS files that belong to this Mapbox account according
   * to the configuration. */
  async uploadGisFiles(
    files: GisFilesConfig
  ): Promise<[tilesets: Tilesets, cleanup: () => Promise<void>]> {
    const filesToUpload = this.myFiles(files)
    this.logInfo(
      `Files to upload to the Mapbox account '${
        this.username
      }': ${JSON.stringify(filesToUpload, undefined, 2)}`
    )
    const [uploadedTilesets, currentVersion] = await this.getUploadedTilesets()
    const oldVersion = currentVersion - 1
    const newVersion = currentVersion + 1
    this.logDebug('Uploading...')
    const uploadRasterFiles = this.uploadFiles(filesToUpload.raster, newVersion)
    const uploadVectorFiles = this.uploadFiles(filesToUpload.vector, newVersion)
    const [rasterTilesets, vectorTilesets] = await Promise.all([
      uploadRasterFiles,
      uploadVectorFiles
    ])
    const cleanup = async (): Promise<void> => {
      this.logInfo('Removing old tilesets, if any...')
      await this.deleteOldTilesets(uploadedTilesets, oldVersion)
    }
    return [
      {
        raster: rasterTilesets,
        vector: vectorTilesets
      },
      cleanup
    ]
  }

  async rotateUserAccessToken(): Promise<void> {
    await deleteUserAccessToken(
      this.username,
      this.userAccessTokenId,
      this.adminAccessToken
    )
    const token = await createUserAccessToken(
      this.username,
      this.adminAccessToken
    )
    this.userAccessToken = token.token
    this.userAccessTokenId = token.id
  }

  getAccessData(tilesets: Tilesets): MapboxAccess {
    return {
      username: this.username,
      token: this.userAccessToken,
      ...tilesets
    }
  }
}

export default class Mapbox {
  accounts

  static async build(accountsConfig: MapboxAccountConfig[]): Promise<Mapbox> {
    const accounts = await Promise.all(
      accountsConfig.map(
        async (account: MapboxAccountConfig) =>
          await MapboxAccount.build(account)
      )
    )
    return new Mapbox(accounts)
  }

  constructor(accounts: MapboxAccount[]) {
    this.accounts = accounts
  }

  /**
   * Uploads to each account a subset of the given files.
   * The config of the account is used to pick files.
   */
  async upload(
    files: GisFilesConfig
  ): Promise<ResultWithCleanup<MapboxAccess[]>> {
    const results: Array<ResultWithCleanup<MapboxAccess>> = await Promise.all(
      this.accounts.map(async account => {
        const [uploadedTilesets, cleanupUpload] = await account.uploadGisFiles(
          files
        )
        return [account.getAccessData(uploadedTilesets), cleanupUpload]
      })
    )
    return collectResultsWithCleanup(results)
  }

  async rotateUserAccessTokens(): Promise<void> {
    for (const account of this.accounts) {
      await account.rotateUserAccessToken()
    }
  }
}
