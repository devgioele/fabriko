import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createReadStream } from 'fs'
import type { S3Creds } from '../types/mapbox'
import * as core from '@actions/core'
import HttpStatusCode from '../lib/httpStatusCode'
import { inspect } from 'util'

// See all regions here: https://awsregion.info
// Mapbox uses 'us-east-1' in the tutorial https://docs.mapbox.com/help/tutorials/upload-curl/#stage-your-data
const region = 'us-east-1'

export const uploadFileToS3 = async (
  filePath: string,
  s3Creds: S3Creds
): Promise<void> => {
  core.debug(
    `Uploading to S3 bucket '${s3Creds.bucket}' with key '${s3Creds.key}'...`
  )
  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: s3Creds.accessKeyId,
      secretAccessKey: s3Creds.secretAccessKey,
      sessionToken: s3Creds.sessionToken
    }
  })
  const stream = createReadStream(filePath)
  const cmd = new PutObjectCommand({
    Bucket: s3Creds.bucket,
    Key: s3Creds.key,
    Body: stream
  })
  const response = await s3Client.send(cmd)
  inspect(response)
  const code = response.$metadata.httpStatusCode
  if (code !== HttpStatusCode.OK) {
    throw new Error(
      `Could not upload to S3 bucket! HTTP response code: ${code}`
    )
  }
}
