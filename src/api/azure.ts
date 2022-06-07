import { ClientSecretCredential } from '@azure/identity'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { loadEnvVar } from '../lib/env'
import path from 'path'
import { promisify } from 'util'
import { pipeline } from 'stream'
import { createWriteStream } from 'fs'
import { axiosAuthConfig } from './base'
import axios from 'axios'
import * as core from '@actions/core'
import { decodeJWT } from '../lib/common'

const tenantId = loadEnvVar('AZURE_TENANT_ID')
const clientId = loadEnvVar('AZURE_CLIENT_ID')
const clientSecret = loadEnvVar('AZURE_CLIENT_SECRET')

/* The following articles explains that client credentials flows (we are
supposedly using one) cannot use scopes. By passing the client ID as the
scope, we requiest the access token with no consent and all claims.
https://damienbod.com/2020/10/01/implement-azure-ad-client-credentials-flow-using-client-certificates-for-service-apis

If you find the official Microsoft documentation that explains this,
please add it here.
*/
const scopes = [`${clientId}/.default`, 'https://storage.azure.com/.default']

export enum Scope {
  FUNCTIONS = 0,
  BLOB_STORAGE = 1
}

const getScope = (scope: Scope): string => scopes[scope]

const pipelineAsync = promisify(pipeline)

export class BlobStorageClient {
  azure: AzureClient

  static async build(): Promise<BlobStorageClient> {
    const azureClient = await AzureClient.build(Scope.BLOB_STORAGE)
    return new BlobStorageClient(azureClient)
  }

  constructor(client: AzureClient) {
    this.azure = client
  }

  async fetchBlobStorageFile(
    url: string,
    outputDir: string,
    fileName?: string
  ): Promise<string> {
    // If not defined, take the file name from the url
    if (!fileName) {
      fileName = url.split('/').pop()
    }
    if (!fileName) {
      throw new Error(`The given url does not point to a file: ${url}`)
    }
    const outputFile = path.join(outputDir, fileName)
    const headers = {
      Authorization: `Bearer ${this.azure.token}`,
      // https://docs.microsoft.com/en-us/rest/api/storageservices/versioning-for-the-azure-storage-services
      'x-ms-version': '2021-06-08'
    }
    const { data } = await axios.get(url, {
      headers,
      responseType: 'stream'
    })
    await pipelineAsync(data, createWriteStream(outputFile))
    return outputFile
  }
}

export class FunctionsClient {
  azure: AzureClient

  static async build(): Promise<FunctionsClient> {
    const azureClient = await AzureClient.build(Scope.FUNCTIONS)
    return new FunctionsClient(azureClient)
  }

  constructor(client: AzureClient) {
    this.azure = client
  }
}

class AzureClient {
  token: string

  static async build(scope: Scope): Promise<AzureClient> {
    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret
    )
    const token = await credential.getToken(getScope(scope))
    // Print token
    if (core.isDebug()) {
      const payload = decodeJWT(token.token)
      core.debug(`Token = ${token.token}`)
      core.debug(`Decoded payload of token = ${payload}`)
    }
    return new AzureClient(token.token)
  }

  constructor(token: string) {
    this.token = token
  }

  async get<T = unknown, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<T> {
    const { data } = await axios.get<T>(
      url,
      axiosAuthConfig(this.token, config)
    )
    return data
  }

  async put<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return await axios.put<T, R, D>(
      url,
      data,
      axiosAuthConfig(this.token, config)
    )
  }
}
