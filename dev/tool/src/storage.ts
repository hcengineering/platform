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

import { type Attachment } from '@hcengineering/attachment'
import {
  type Blob,
  type MeasureContext,
  type Ref,
  concatLink,
  RateLimiter,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import { type DatalakeClient } from '@hcengineering/datalake'
import { type UploadObjectParams } from '@hcengineering/datalake/types/client'
import { DOMAIN_ATTACHMENT } from '@hcengineering/model-attachment'
import { type S3Config, type S3Service } from '@hcengineering/s3'
import {
  type ListBlobResult,
  type StorageAdapter,
  type StorageAdapterEx,
  type UploadedObjectInfo
} from '@hcengineering/server-core'
import { type Db } from 'mongodb'
import { PassThrough, type Readable } from 'stream'

export interface MoveFilesParams {
  concurrency: number
  move: boolean
}

export async function moveFiles (
  ctx: MeasureContext,
  wsIds: WorkspaceIds,
  exAdapter: StorageAdapterEx,
  params: MoveFilesParams
): Promise<void> {
  if (exAdapter.adapters === undefined) return

  const target = exAdapter.adapters[0].adapter
  if (target === undefined) return

  // We assume that the adapter moves all new files to the default adapter
  await target.make(ctx, wsIds)

  for (const { name, adapter } of exAdapter.adapters.slice(1).reverse()) {
    console.log('moving from', name, 'limit', 'concurrency', params.concurrency)

    // we attempt retry the whole process in case of failure
    // files that were already moved will be skipped
    await retryOnFailure(ctx, 5, async () => {
      await processAdapter(ctx, exAdapter, adapter, target, wsIds, params)
    })
  }
}

export async function showLostFiles (
  ctx: MeasureContext,
  wsIds: WorkspaceIds,
  db: Db,
  storageAdapter: StorageAdapter,
  { showAll }: { showAll: boolean }
): Promise<void> {
  const iterator = db.collection<Attachment>(DOMAIN_ATTACHMENT).find({})

  while (true) {
    const attachment = await iterator.next()
    if (attachment === null) break

    const { _id, _class, file, name, modifiedOn } = attachment
    const date = new Date(modifiedOn).toISOString()

    const stat = await storageAdapter.stat(ctx, wsIds, file)
    if (stat === undefined) {
      console.warn('-', date, _class, _id, file, name)
    } else if (showAll) {
      console.log('+', date, _class, _id, file, name)
    }
  }
}

async function processAdapter (
  ctx: MeasureContext,
  exAdapter: StorageAdapterEx,
  source: StorageAdapter,
  target: StorageAdapter,
  wsIds: WorkspaceIds,
  params: MoveFilesParams
): Promise<void> {
  if (source === target) {
    // Just in case
    return
  }
  let time = Date.now()
  let processedCnt = 0
  let processedBytes = 0
  let movedCnt = 0
  let movedBytes = 0
  let batchBytes = 0

  function printStats (): void {
    const duration = Date.now() - time
    console.log(
      '...processed',
      processedCnt,
      Math.round(processedBytes / 1024 / 1024) + 'MB',
      'moved',
      movedCnt,
      Math.round(movedBytes / 1024 / 1024) + 'MB',
      '+' + Math.round(batchBytes / 1024 / 1024) + 'MB',
      Math.round(duration / 1000) + 's'
    )

    batchBytes = 0
    time = Date.now()
  }

  const rateLimiter = new RateLimiter(params.concurrency)

  const iterator = await source.listStream(ctx, wsIds)

  const targetIterator = await target.listStream(ctx, wsIds)

  const targetBlobs = new Map<Ref<Blob>, ListBlobResult>()

  let targetFilled = false

  const toRemove: string[] = []
  try {
    while (true) {
      const dataBulk = await iterator.next()
      if (dataBulk.length === 0) break

      if (!targetFilled) {
        // Only fill target if have something to move.
        targetFilled = true
        while (true) {
          const part = await targetIterator.next()
          for (const p of part) {
            targetBlobs.set(p._id, p)
          }
          if (part.length === 0) {
            break
          }
        }
      }

      for (const data of dataBulk) {
        const targetBlob: Blob | ListBlobResult | undefined = targetBlobs.get(data._id)
        if (targetBlob !== undefined) {
          console.log('Target blob already exists', targetBlob._id)
          // We could safely delete source blob
          toRemove.push(data._id)
        }

        if (targetBlob === undefined) {
          const sourceBlob = await source.stat(ctx, wsIds, data._id)

          if (sourceBlob === undefined) {
            console.error('blob not found', data._id)
            continue
          }
          const info = await rateLimiter.exec(async () => {
            try {
              const result = await retryOnFailure(
                ctx,
                5,
                async () => {
                  return await processFile(ctx, source, target, wsIds, sourceBlob)
                },
                50
              )
              movedCnt += 1
              movedBytes += sourceBlob.size
              batchBytes += sourceBlob.size
              return result
            } catch (err) {
              console.error('failed to process blob', data._id, err)
            }
          })

          // We could safely delete source blob
          if (info !== undefined) {
            toRemove.push(sourceBlob._id)
          }
          processedBytes += sourceBlob.size
        }
        processedCnt += 1

        if (processedCnt % 100 === 0) {
          await rateLimiter.waitProcessing()
          printStats()
        }
      }
    }

    await rateLimiter.waitProcessing()
    if (toRemove.length > 0 && params.move) {
      while (toRemove.length > 0) {
        const part = toRemove.splice(0, 500)
        await source.remove(ctx, wsIds, part)
      }
    }
    printStats()
  } finally {
    await iterator.close()
  }
}

async function processFile (
  ctx: MeasureContext,
  source: Pick<StorageAdapter, 'get'>,
  target: Pick<StorageAdapter, 'put'>,
  wsIds: WorkspaceIds,
  blob: Blob
): Promise<UploadedObjectInfo> {
  const readable = await source.get(ctx, wsIds, blob._id)
  try {
    readable.on('end', () => {
      readable.destroy()
    })
    const stream = readable.pipe(new PassThrough())
    return await target.put(ctx, wsIds, blob._id, stream, blob.contentType, blob.size)
  } finally {
    readable.destroy()
  }
}

async function retryOnFailure<T> (
  ctx: MeasureContext,
  retries: number,
  op: () => Promise<T>,
  delay: number = 0
): Promise<T> {
  let lastError: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      console.error(err)
      lastError = err
      ctx.error('error', { err, retries })
      if (retries !== 0 && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export interface CopyDatalakeParams {
  concurrency: number
  existing: boolean
}

export async function copyToDatalake (
  ctx: MeasureContext,
  wsIds: WorkspaceIds,
  config: S3Config,
  adapter: S3Service,
  datalake: DatalakeClient,
  params: CopyDatalakeParams
): Promise<void> {
  console.log('copying from', config.name, 'concurrency:', params.concurrency)

  const exists = await adapter.exists(ctx, wsIds)
  if (!exists) {
    console.log('no files to copy')
    return
  }

  let time = Date.now()
  let processedCnt = 0
  let processedSize = 0
  let skippedCnt = 0
  let existingCnt = 0
  let failedCnt = 0

  function printStats (): void {
    const duration = Date.now() - time
    console.log(
      '...processed',
      processedCnt,
      'skipped',
      skippedCnt,
      'existing',
      existingCnt,
      'failed',
      failedCnt,
      Math.round(duration / 1000) + 's',
      formatSize(processedSize)
    )

    time = Date.now()
  }

  const existing = new Set<string>()

  let cursor: string | undefined = ''
  let hasMore = true
  while (hasMore) {
    const res = await datalake.listObjects(ctx, wsIds.uuid, cursor, 1000)
    cursor = res.cursor
    hasMore = res.cursor !== undefined
    for (const blob of res.blobs) {
      existing.add(blob.name)
    }
  }

  console.info('found blobs in datalake:', existing.size)

  const rateLimiter = new RateLimiter(params.concurrency)

  const iterator = await adapter.listStream(ctx, wsIds)

  try {
    while (true) {
      const batch = await iterator.next()
      if (batch.length === 0) break

      for (const blob of batch) {
        const objectName = blob._id
        if (objectName.includes('%preview%') || objectName.includes('%size%') || objectName.endsWith('#history')) {
          skippedCnt++
          continue
        }

        if (!params.existing && existing.has(objectName)) {
          // TODO handle mutable blobs
          existingCnt++
          continue
        }

        await rateLimiter.add(async () => {
          try {
            await retryOnFailure(
              ctx,
              5,
              async () => {
                await copyBlobToDatalake(ctx, wsIds, blob, config, adapter, datalake)
                processedCnt += 1
                processedSize += blob.size
              },
              50
            )
          } catch (err) {
            console.error('failed to process blob', objectName, err)
            failedCnt++
          }
        })
      }
      await rateLimiter.waitProcessing()
      printStats()
    }

    await rateLimiter.waitProcessing()
    printStats()
  } finally {
    await iterator.close()
  }
}

export async function copyBlobToDatalake (
  ctx: MeasureContext,
  wsIds: WorkspaceIds,
  blob: ListBlobResult,
  config: S3Config,
  adapter: S3Service,
  datalake: DatalakeClient
): Promise<void> {
  const objectName = blob._id
  if (blob.size < 1024 * 1024 * 64) {
    // Handle small file
    const { endpoint, accessKey: accessKeyId, secretKey: secretAccessKey, region } = config

    const bucketId = adapter.getBucketId(wsIds)
    const objectId = adapter.getDocumentKey(wsIds, encodeURIComponent(objectName))
    const url = concatLink(endpoint, `${bucketId}/${objectId}`)

    const params = { url, accessKeyId, secretAccessKey, region }
    await datalake.uploadFromS3(ctx, wsIds.uuid, objectName, params)
  } else {
    // Handle huge file
    const stat = await adapter.stat(ctx, wsIds, objectName)
    if (stat !== undefined) {
      const metadata = {
        lastModified: stat.modifiedOn,
        name: objectName,
        type: stat.contentType,
        size: stat.size
      }

      const readable = await adapter.get(ctx, wsIds, objectName)
      try {
        console.log('uploading huge blob', objectName, Math.round(stat.size / 1024 / 1024), 'MB')
        await uploadMultipart(ctx, datalake, wsIds.uuid, objectName, readable, metadata)
        console.log('done', objectName)
      } finally {
        readable.destroy()
      }
    }
  }
}

function uploadMultipart (
  ctx: MeasureContext,
  datalake: DatalakeClient,
  workspaceId: WorkspaceUuid,
  objectName: string,
  stream: Readable,
  metadata: UploadObjectParams
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const passthrough = new PassThrough()

    const cleanup = (): void => {
      stream.removeAllListeners()
      passthrough.removeAllListeners()
      stream.destroy()
      passthrough.destroy()
    }

    stream.on('error', (err) => {
      ctx.error('error reading blob', { err })
      cleanup()
      reject(err)
    })
    passthrough.on('error', (err) => {
      ctx.error('error reading blob', { err })
      cleanup()
      reject(err)
    })

    stream.pipe(passthrough)

    datalake
      .uploadMultipart(ctx, workspaceId, objectName, passthrough, metadata)
      .then(() => {
        cleanup()
        resolve()
      })
      .catch((err) => {
        ctx.error('failed to upload blob', { err })
        cleanup()
        reject(err)
      })
  })
}

export function formatSize (size: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const pow = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024))
  const val = (1.0 * size) / Math.pow(1024, pow)
  return `${val.toFixed(2)} ${units[pow]}`
}
