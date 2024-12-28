//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Blob, MeasureContext, systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { DatalakeConfig, DatalakeService, createDatalakeClient } from '@hcengineering/datalake'
import { S3Config, S3Service } from '@hcengineering/s3'
import { StorageConfig } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { v4 as uuid } from 'uuid'

export interface S3UploadParams {
  filepath: string
  endpoint: string
  accessKey: string
  region: string
  secret: string
  bucket: string
}

export async function getS3UploadParams (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  storageConfig: StorageConfig,
  s3StorageConfig: StorageConfig | undefined
): Promise<S3UploadParams> {
  if (storageConfig.kind === 's3') {
    return await getS3UploadParamsS3(ctx, workspaceId, storageConfig as S3Config)
  } else if (storageConfig.kind === 'datalake') {
    if (s3StorageConfig === undefined || s3StorageConfig.kind !== 's3') {
      throw new Error('Please provide S3 storage config')
    }
    return await getS3UploadParamsDatalake(
      ctx,
      workspaceId,
      storageConfig as DatalakeConfig,
      s3StorageConfig as S3Config
    )
  } else {
    throw new Error('Unknown storage kind: ' + storageConfig.kind)
  }
}

export async function saveFile (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  storageConfig: StorageConfig,
  s3StorageConfig: StorageConfig | undefined,
  filename: string
): Promise<Blob | undefined> {
  if (storageConfig.kind === 's3') {
    return await saveFileToS3(ctx, workspaceId, storageConfig as S3Config, filename)
  } else if (storageConfig.kind === 'datalake') {
    if (s3StorageConfig === undefined || s3StorageConfig.kind !== 's3') {
      throw new Error('Please provide S3 storage config')
    }
    return await saveFileToDatalake(
      ctx,
      workspaceId,
      storageConfig as DatalakeConfig,
      s3StorageConfig as S3Config,
      filename
    )
  } else {
    throw new Error('Unknown storage kind: ' + storageConfig.kind)
  }
}

async function getS3UploadParamsS3 (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  storageConfig: S3Config
): Promise<S3UploadParams> {
  const endpoint = storageConfig.endpoint
  const accessKey = storageConfig.accessKey
  const secret = storageConfig.secretKey
  const region = storageConfig.region ?? 'auto'
  const bucket = getBucket(storageConfig, workspaceId)
  const name = uuid()
  const filepath = getDocumentKey(storageConfig, workspaceId, `${name}.mp4`)

  return {
    filepath,
    endpoint,
    accessKey,
    region,
    secret,
    bucket
  }
}

async function getS3UploadParamsDatalake (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  config: DatalakeConfig,
  s3config: S3Config
): Promise<S3UploadParams> {
  const token = generateToken(systemAccountUuid, workspaceId)
  const client = createDatalakeClient(config, token)
  const { bucket } = await client.getR2UploadParams(ctx, workspaceId)

  const endpoint = s3config.endpoint
  const accessKey = s3config.accessKey
  const secret = s3config.secretKey
  const region = s3config.region ?? 'auto'
  const name = uuid()
  const filepath = getDocumentKey(s3config, workspaceId, `${name}.mp4`)

  return {
    filepath,
    endpoint,
    accessKey,
    region,
    secret,
    bucket
  }
}

async function saveFileToS3 (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  config: S3Config,
  filename: string
): Promise<Blob | undefined> {
  const storageAdapter = new S3Service(config)
  const prefix = rootPrefix(config, workspaceId)
  const uuid = stripPrefix(prefix, filename)
  return await storageAdapter.stat(ctx, workspaceId, uuid)
}

async function saveFileToDatalake (
  ctx: MeasureContext,
  workspaceId: WorkspaceUuid,
  config: DatalakeConfig,
  s3config: S3Config,
  filename: string
): Promise<Blob | undefined> {
  const token = generateToken(systemAccountUuid, workspaceId)
  const client = createDatalakeClient(config, token)
  const storageAdapter = new DatalakeService(config)

  const prefix = rootPrefix(s3config, workspaceId)
  const uuid = stripPrefix(prefix, filename)

  await client.uploadFromR2(ctx, workspaceId, uuid, { filename: uuid })

  return await storageAdapter.stat(ctx, workspaceId, uuid)
}

function getBucket (storageConfig: S3Config, workspaceId: WorkspaceUuid): string {
  return storageConfig.rootBucket ?? (storageConfig.bucketPrefix ?? '') + workspaceId
}

function getBucketFolder (workspaceId: WorkspaceUuid): string {
  return workspaceId
}

function getDocumentKey (storageConfig: any, workspace: WorkspaceUuid, name: string): string {
  return storageConfig.rootBucket === undefined ? name : `${getBucketFolder(workspace)}/${name}`
}

function stripPrefix (prefix: string | undefined, key: string): string {
  if (prefix !== undefined && key.startsWith(prefix)) {
    return key.slice(prefix.length)
  }
  return key
}

function rootPrefix (storageConfig: S3Config, workspaceId: WorkspaceUuid): string | undefined {
  return storageConfig.rootBucket !== undefined ? getBucketFolder(workspaceId) + '/' : undefined
}
