import type { FunctionsClient } from './api/azure'
import HttpStatusCode from './lib/httpStatusCode'
import type { Permission, Role } from './types/input'
import type { MapboxAccess } from './types/mapbox'
import { setInterval } from 'timers/promises'
import * as core from '@actions/core'
import type { AxiosResponse } from 'axios'

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
  const fetch = async (): Promise<AxiosResponse<unknown, unknown>> =>
    await client.azure.put('/roles', requestBody)
  // Azure Functions fails with error 503 occasionally and resumes nominal operation after a couple of seconds.
  // Attempt multiple times with an interval in between
  let extraAttempts = 4
  const interval = 3000
  let done = await attemptUpdate(fetch, extraAttempts, interval)
  if (!done) {
    for await (const _ of setInterval(interval)) {
      extraAttempts -= 1
      done = await attemptUpdate(fetch, extraAttempts, interval)
      if (done) {
        break
      }
    }
  }
}

/** Attempts an update of the roles and returns true if done. */
const attemptUpdate = async (
  fetch: () => Promise<AxiosResponse<unknown, unknown>>,
  attempts: number,
  interval: number
): Promise<boolean> => {
  const response = await fetch()
  if (response.status === HttpStatusCode.OK) {
    return true
  } else if (
    response.status === HttpStatusCode.SERVICE_UNAVAILABLE &&
    attempts > 0
  ) {
    core.info(
      `Azure Functions service unavailable! Attempting again in ${interval}ms`
    )
    return false
  }
  throw new Error(`Unexpected response: ${response.status}`)
}
