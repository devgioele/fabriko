export enum TilesetType {
  VECTOR = 'vector',
  RASTER = 'raster'
}

export type Tileset = {
  name: string
  id: string
}

export type Tilesets = {
  raster: Tileset[]
  vector: Tileset[]
}

export type MapboxAccess = {
  username: string
  token: string
} & Tilesets

export type MapboxToken = {
  /** The token's unique identifier. This is not the access token itself, but rather an identifier for a specific token. */
  id: string
  /** The type of token. */
  usage: 'pk' | 'sk' | 'tk'
  /** The client for the token. */
  client: 'api'
  /** Indicates whether the token is a default token. */
  default: boolean
  /** An array that contains the scopes granted to the token. */
  scopes: string[]
  /** A human-readable description of the token. */
  note: string
  /** The date and time the token was created. */
  created: string
  /** The date and time the token was last modified. */
  modified: string
  /** The URLs that the token is restricted to. */
  allowedUrls: string[]
  /**	The token itself. */
  token: string
}

export type MapboxTileset = {
  /** The kind of data contained. */
  type: TilesetType
  /** The longitude, latitude, and zoom level for the center of the contained data, given in the format `[lon, lat, zoom]`. */
  center: [number, number, number]
  /** A timestamp indicating when the tileset was created. */
  created: string
  /** A human-readable description of the tileset. */
  description: string
  /** The storage in bytes consumed by the tileset. */
  filesize: number
  /** The unique identifier for the tileset. */
  id: string
  /** A timestamp indicating when the tileset was last modified. */
  modified: string
  /** The name of the tileset. */
  name: string
  /** The access control for the tileset. */
  visibility: 'private' | 'public'
  /** The processing status of the tileset. */
  status: 'available' | 'pending' | 'invalid'
}

export type S3Creds = {
  accessKeyId: string
  bucket: string
  key: string
  secretAccessKey: string
  sessionToken: string
  url: string
}

export type MapboxUploadStatus = {
  /** Whether the upload is complete (true) or not complete (false). */
  complete: boolean
  /** The ID of the tileset that will be created or replaced if upload is successful. */
  tileset: string
  /** If `null`, the upload is in progress or has successfully completed. Otherwise, provides a brief explanation of the error. */
  error: string | null
  /** The unique identifier for the upload. */
  id: string
  /** The name of the upload. */
  name: string
  /** A timestamp indicating when the upload resource was last modified. */
  modified: string
  /** A timestamp indicating when the upload resource was created. */
  created: string
  /** The unique identifier for the owner's account. */
  owner: string
  /** The progress of the upload, expressed as a float between `0` (started) and `1` (completed). */
  progress: number
}

export type MapboxAxiosConfig = Partial<{ jwt: string; cache: boolean }>
