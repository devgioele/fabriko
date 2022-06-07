import { groupFeatures } from '@devgioele/winged'
import path from 'path'
import type { BlobStorageClient } from './api/azure'
import { regexMatches } from './lib/common'
import type { GisFileConfig, GisFilesConfig } from './types/input'

const fetchFiles = async (
  azureClient: BlobStorageClient,
  gisFiles: GisFileConfig[],
  outputDir: string,
  fileExtension?: string
): Promise<GisFileConfig[]> =>
  await Promise.all(
    gisFiles.map(
      // Use the path to download the file and store the local path as the
      // new path
      async gisFile => ({
        ...gisFile,
        path: await azureClient.fetchBlobStorageFile(
          gisFile.path,
          outputDir,
          `${gisFile.name}${fileExtension}`
        )
      })
    )
  )

export const fetchGisFiles = async (
  azureClient: BlobStorageClient,
  gisFiles: GisFilesConfig,
  outputDir: string
): Promise<GisFilesConfig> => {
  const fetchRasterFiles = fetchFiles(
    azureClient,
    gisFiles.raster,
    outputDir,
    '.geotiff'
  )
  const fetchVectorFiles = fetchFiles(
    azureClient,
    gisFiles.vector,
    outputDir,
    '.geojsonl'
  )
  const [rasterFilePaths, vectorFilePaths] = await Promise.all([
    fetchRasterFiles,
    fetchVectorFiles
  ])
  return {
    vector: vectorFilePaths,
    raster: rasterFilePaths
  }
}

/**
 * Takes the first part of the file name that includes word characters
 * (including `_`) only.
 */
const getParsedFileName = (filePath: string): string | undefined => {
  const fileName = path.parse(filePath).name
  const fileNamePrefix = regexMatches(fileName, /^(\w+)[^\w].*$/u)
  return fileNamePrefix
}

/** Groups features into separate vector files,
 * according to the given properties. */
export const groupVectorFiles = async (
  files: GisFileConfig[],
  outputDir: string,
  properties: string[]
): Promise<GisFileConfig[]> => {
  // Group features into multiple GeoJSON files
  const [generatedFiles, malformedFiles] = await groupFeatures(
    files,
    outputDir,
    properties,
    { toGeoJson: true }
  )
  if (malformedFiles.length > 0) {
    throw new Error(
      `Malformed files:\n${JSON.stringify(malformedFiles, null, 2)}
      \nDo the features have the properties '${properties}'?`
    )
  }
  return generatedFiles.map(filePath => {
    const fileName = getParsedFileName(filePath)
    if (!fileName) {
      throw new Error(
        `The file '${filePath}' has an invalid name! No prefix could be found.`
      )
    }
    return {
      name: fileName,
      path: filePath
    }
  })
}
