import { readFileSync } from 'fs'
import type { Config, Input } from './types/input'
import { configSchema } from './types/input'
import YAML from 'yaml'
import { camelizeKebab, compileErrors } from './lib/common'
import * as core from '@actions/core'
import { loadEnvVar } from './lib/env'
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

/** Interpolates secrets contained by the given config with the secrets provided
 * through the environment variable `SECRETS_CONTEXT`.
 */
const interpolateSecrets = (config: Config): Config => {
  const secretsContext: StringDictionary = JSON.parse(
    loadEnvVar('SECRETS_CONTEXT')
  )
  const customizeer = <T>(value: T): T | undefined => {
    if (typeof value === 'string') {
      const matches = [...value.matchAll(/\${{ ?secrets\.([\w_]+) ?}}/gi)]
      const firstMatch = matches[0]
      if (firstMatch) {
        // Second group
        const secretName = firstMatch[1]
        return secretsContext[secretName] as T
      }
    }
  }
  return cloneDeepWith(config, customizeer)
}

export const parseConfig = (path: string): Config => {
  const configFile = readFileSync(path, 'utf8')
  const parsed = YAML.parse(configFile)
  const camelized = camelizeKebab(parsed)
  const config = validConfig(camelized)
  return interpolateSecrets(config)
}

export const parseInput = (): Input => ({
  config: parseConfig(core.getInput('config'))
})
