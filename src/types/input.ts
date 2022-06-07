import { z } from 'zod'

const gisFileSchema = z.object({
  name: z.string(),
  path: z.string()
})

export type GisFileConfig = z.infer<typeof gisFileSchema>

const gisFilesSchema = z.object({
  raster: gisFileSchema.array(),
  vector: gisFileSchema.array()
})

export type GisFilesConfig = z.infer<typeof gisFilesSchema>

const mapboxGisFilesSchema = z.object({
  raster: z.string().array(),
  vector: z.string().array()
})

export type MapboxGisFilesConfig = z.infer<typeof mapboxGisFilesSchema>

const mapboxAccountSchema = z.object({
  username: z.string(),
  adminAccessToken: z.string(),
  groupsRegex: z.string(),
  gisFiles: mapboxGisFilesSchema
})

export type MapboxAccountConfig = z.infer<typeof mapboxAccountSchema>

const mapboxAccountsSchema = z.array(mapboxAccountSchema)

const permissionSchema = z.object({
  id: z.string(),
  description: z.string()
})

export type Permission = z.infer<typeof permissionSchema>

const permissionsSchema = z.array(permissionSchema)

const roleSchema = z.object({
  id: z.string(),
  description: z.string(),
  usersRegex: z.string(),
  mapboxAccount: z.string(),
  permissions: z.string().array()
})

export type Role = z.infer<typeof roleSchema>

export const configSchema = z.object({
  rotateMapboxTokens: z.boolean(),
  groupBy: z.string().array(),
  gisFiles: gisFilesSchema,
  mapboxAccounts: mapboxAccountsSchema,
  permissions: permissionsSchema,
  roles: roleSchema.array()
})

export type Config = z.infer<typeof configSchema>

export type Input = {
  config: Config
}
