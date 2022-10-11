import type { AxiosRequestConfig, ResponseType } from 'axios'
import axios from 'axios'
import * as core from '@actions/core'

axios.interceptors.request.use(
  config => {
    const { method, url } = config
    core.debug(`Sending ${method?.toUpperCase()} request to '${url}'...`)
    return config
  },
  error => Promise.reject(error)
)

const stringifyData = (
  data: unknown,
  type: ResponseType | undefined
): string | undefined => {
  let parsedData
  if (!type || type === 'json' || type === 'text') {
    try {
      parsedData = JSON.stringify(data)
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`Could not stringify response: ${e.message}`)
      }
      throw e
    }
  }
  return parsedData
}

axios.interceptors.response.use(
  response => {
    const { config, data } = response
    const { responseType } = config
    const msg = `Received a response of type '${responseType}' from a ${config.method?.toUpperCase()} request to '${
      config.url
    }'`
    const parsedData = data && stringifyData(data, responseType)
    if (parsedData) {
      core.debug(`${msg}: ${parsedData}`)
    } else {
      core.debug(`${msg}.`)
    }
    return response
  },
  error => {
    if (axios.isAxiosError(error)) {
      const { method, url, responseType } = error.config
      const response = error?.response
      const msg = `${method?.toUpperCase()} request to '${url}' failed with status code ${
        response?.status
      }`
      const data = response?.data
      const parsedData = data && stringifyData(data, responseType)
      if (parsedData) {
        core.warning(`${msg} and with response: ${parsedData}`)
      } else {
        core.warning(`${msg}.`)
      }
    }
    return Promise.reject(error)
  }
)

export const axiosAuthConfig = <D = unknown>(
  jwt: string,
  config?: AxiosRequestConfig<D>
): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${jwt}` },
  ...config
})
