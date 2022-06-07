import * as core from '@actions/core'
import Mapbox from './mapbox'
import { parseInput } from './input'
import { updateRolesMapboxAccess } from './store'
import { fetchGisFiles, groupVectorFiles } from './gisFiles'
import { BlobStorageClient, FunctionsClient } from './api/azure'

async function run(): Promise<void> {
  try {
    const input = parseInput()
    const { config } = input

    core.info('Authenticating for Azure resources...')
    const functionsClient = await FunctionsClient.build()
    const blobStorageClient = await BlobStorageClient.build()

    core.info('Accessing Mapbox accounts...')
    const mapbox = await Mapbox.build(config.mapboxAccounts)

    if (config.rotateMapboxTokens) {
      core.info('Rotating Mapbox tokens...')
      try {
        await mapbox.rotateUserAccessTokens()
      } catch (e) {
        core.error(`Mapbox user access tokens could not be rotated!\n${e}`)
      }
    }

    core.info('Fetching files...')
    const files = await fetchGisFiles(blobStorageClient, config.gisFiles, './')

    core.debug(`Files before grouping = ${JSON.stringify(files)}`)

    core.info('Grouping...')
    files.vector = await groupVectorFiles(
      files.vector,
      './vector',
      config.groupBy
    )

    core.debug(`Files after grouping = ${JSON.stringify(files)}`)

    core.info('Uploading files to Mapbox...')
    const [mapboxAccesses, cleanupUploads] = await mapbox.upload(files)

    core.info('Updating store with new roles and Mapbox access data...')
    await updateRolesMapboxAccess(
      functionsClient,
      config.roles,
      config.permissions,
      mapboxAccesses
    )

    await cleanupUploads()

    core.info('Done!')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
