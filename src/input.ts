import { readFileSync } from 'fs'
import type { Config, Input } from './types/input'
import { configSchema } from './types/input'
import YAML from 'yaml'
import { camelizeKebab, compileErrors, parseNumber } from './lib/common'
import * as core from '@actions/core'
import { cloneDeepWith } from 'lodash'
import type { StringDictionary } from './types/common'

/**
 * @returns Whether the first array is a subset of the second array.
 */
const isSubsetOf = <T>(arr1: T[], arr2: T[]): boolean =>
  arr1.every(e => arr2.includes(e))

/**
 * Checks that all the GIS files specified for the Mapbox accounts are
 * a subset of all the defined GIS files.
 * @returns `null` if the GIS files exist, the error message if otherwise.
 */
const roleGisFilesExist = (config: Config): null | string => {
  const definedRasterFiles = config.gisFiles.raster.map(gisFile => gisFile.name)
  const definedVectorFiles = config.gisFiles.vector.map(gisFile => gisFile.name)
  const areASubset = config.mapboxAccounts.every(
    account =>
      isSubsetOf(account.gisFiles.raster, definedRasterFiles) &&
      isSubsetOf(account.gisFiles.vector, definedVectorFiles)
  )
  return areASubset
    ? null
    : 'There is at least one Mapbox account with a GIS file that does not exist.'
}

/** Checks that all the Mapbox accounts specified for the roles are
 * a subset of all the defined Mapbox accounts.
 * @returns `null` if the Mapbox accounts exist, the error message if otherwise.
 */
const mapboxAccountsExist = (config: Config): null | string => {
  const definedAccounts = config.mapboxAccounts.map(account => account.username)
  const areASubset = config.roles.every(role =>
    definedAccounts.includes(role.mapboxAccount)
  )
  return areASubset
    ? null
    : 'There is at least one user role with a Mapbox account that does not exist.'
}

const permissionsExist = (config: Config): null | string => {
  const definedPermissions = config.permissions.map(permission => permission.id)
  const areASubset = config.roles.every(role =>
    role.permissions.every(permission =>
      definedPermissions.includes(permission)
    )
  )
  return areASubset
    ? null
    : 'There is at least one user role with a permission that does not exist.'
}

const validConfig = (config: unknown): Config => {
  const c = configSchema.parse(config)
  const errorMessages = [
    roleGisFilesExist(c),
    mapboxAccountsExist(c),
    permissionsExist(c)
  ]
  const errors = compileErrors(errorMessages)
  if (errors.amount > 0) {
    throw new Error(errors.message)
  }
  return c
}

/** Removes settings from the given config, creating a subset of the config.
 * Useful for benchmarking purposes where multiple runs require a slightly different config.
 * For example, if 3 roles are to be taken out of 8 roles, the last 5 ones are removed.
 */
const reduceConfig = (
  config: Config,
  maxRoles?: number,
  maxRasterFiles?: number,
  maxVectorFiles?: number
): Config => {
  // Remove roles
  config.roles = config.roles.slice(0, maxRoles)
  /* Remove unused Mapbox accounts,
   * which are accounts not referenced by any role
   */
  config.mapboxAccounts = config.mapboxAccounts.filter(account =>
    config.roles.find(role => role.mapboxAccount === account.username)
  )
  // Remove raster files
  config.gisFiles.raster = config.gisFiles.raster.slice(0, maxRasterFiles)
  // Remove vector files
  config.gisFiles.vector = config.gisFiles.vector.slice(0, maxVectorFiles)
  for (const account of config.mapboxAccounts) {
    // Remove raster files from Mapbox accounts
    account.gisFiles.raster = account.gisFiles.raster.filter(accRaster =>
      config.gisFiles.raster.find(raster => raster.name === accRaster)
    )
    // Remove vector files from Mapbox accounts
    account.gisFiles.vector = account.gisFiles.vector.filter(accVector =>
      config.gisFiles.vector.find(vector => vector.name === accVector)
    )
  }
  return config
}

/** Interpolates secrets in the given config using the provided secrets.
 */
const interpolateSecrets = (
  config: Config,
  secrets: StringDictionary
): Config => {
  const customizer = <T>(value: T): T | undefined => {
    if (typeof value === 'string') {
      const matches = [...value.matchAll(/\${{ ?secrets\.([\w_]+) ?}}/gi)]
      const firstMatch = matches[0]
      if (firstMatch) {
        // Second group
        const secretName = firstMatch[1]
        return secrets[secretName] as T
      }
    }
  }
  return cloneDeepWith(config, customizer)
}

export const parseConfig = (
  path: string,
  secrets: StringDictionary,
  maxRoles?: number,
  maxRasterFiles?: number,
  maxVectorFiles?: number
): Config => {
  const configFile = readFileSync(path, 'utf8')
  const parsed = YAML.parse(configFile)
  const camelized = camelizeKebab(parsed)
  let config = validConfig(camelized)
  config = reduceConfig(config, maxRoles, maxRasterFiles, maxVectorFiles)
  return interpolateSecrets(config, secrets)
}

export const parseInput = (): Input => {
  const input = {
    storeBaseUrl: core.getInput('store-base-url'),
    azureTenantId: core.getInput('azure-tenant-id'),
    azureClientId: core.getInput('azure-client-id'),
    azureClientSecret: core.getInput('azure-client-secret'),
    secrets: JSON.parse(core.getInput('secrets-context')),
    maxRoles: parseNumber(core.getInput('max-roles')),
    maxRasterFiles: parseNumber(core.getInput('max-raster-files')),
    maxVectorFiles: parseNumber(core.getInput('max-vector-files'))
  }
  return {
    config: parseConfig(
      core.getInput('config'),
      input.secrets,
      input.maxRoles,
      input.maxRasterFiles,
      input.maxVectorFiles
    ),
    ...input
  }
}
