import type { FunctionsClient } from './api/azure'
import HttpStatusCode from './lib/httpStatusCode'
import type { Permission, Role } from './types/input'
import type { MapboxAccess } from './types/mapbox'

const baseUrl = 'https://func-kultivas-prod.azurewebsites.net/api'

export const updateRolesMapboxAccess = async (
  client: FunctionsClient,
  roles: Role[],
  permissions: Permission[],
  accesses: MapboxAccess[]
): Promise<void> => {
  const requestBody = {
    roles,
    permissions,
    mapboxAccesses: accesses
  }
  const response = await client.azure.put(`${baseUrl}/roles`, requestBody)
  if (response.status !== HttpStatusCode.OK) {
    throw new Error(`Unexpected response: ${response.status}`)
  }
}
