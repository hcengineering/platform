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

import { type Blob, type MeasureContext, type WorkspaceId, RateLimiter } from '@hcengineering/core'
import { type StorageAdapter, type StorageAdapterEx } from '@hcengineering/server-core'
import { PassThrough } from 'stream'

export interface MoveFilesParams {
  blobSizeLimitMb: number
  concurrency: number
}

export async function moveFiles (
  ctx: MeasureContext,
  workspaceId: WorkspaceId,
  exAdapter: StorageAdapterEx,
  params: MoveFilesParams
): Promise<void> {
  if (exAdapter.adapters === undefined) return

  console.log('start', workspaceId.name)

  // We assume that the adapter moves all new files to the default adapter
  const target = exAdapter.defaultAdapter
  await exAdapter.adapters.get(target)?.make(ctx, workspaceId)

  for (const [name, adapter] of exAdapter.adapters.entries()) {
    if (name === target) continue

    console.log('moving from', name, 'limit', params.blobSizeLimitMb, 'concurrency', params.concurrency)

    // we attempt retry the whole process in case of failure
    // files that were already moved will be skipped
    await retryOnFailure(ctx, 5, async () => {
      await processAdapter(ctx, exAdapter, adapter, workspaceId, params)
    })
  }

  console.log('...done', workspaceId.name)
}

async function processAdapter (
  ctx: MeasureContext,
  exAdapter: StorageAdapterEx,
  adapter: StorageAdapter,
  workspaceId: WorkspaceId,
  params: MoveFilesParams
): Promise<void> {
  const target = exAdapter.defaultAdapter

  let time = Date.now()
  let processedCnt = 0
  let processedBytes = 0
  let skippedCnt = 0
  let movedCnt = 0
  let movedBytes = 0
  let batchBytes = 0

  const rateLimiter = new RateLimiter(params.concurrency)

  const iterator = await adapter.listStream(ctx, workspaceId)
  try {
    while (true) {
      const data = await iterator.next()
      if (data === undefined) break

      const blob =
        (await exAdapter.stat(ctx, workspaceId, data._id)) ?? (await adapter.stat(ctx, workspaceId, data._id))

      if (blob === undefined) {
        console.error('blob not found', data._id)
        continue
      }

      if (blob.provider !== target) {
        if (blob.size <= params.blobSizeLimitMb * 1024 * 1024) {
          await rateLimiter.exec(async () => {
            try {
              await retryOnFailure(
                ctx,
                5,
                async () => {
                  await processFile(ctx, exAdapter, adapter, workspaceId, blob)
                },
                50
              )
              movedCnt += 1
              movedBytes += blob.size
              batchBytes += blob.size
            } catch (err) {
              console.error('failed to process blob', data._id, err)
            }
          })
        } else {
          skippedCnt += 1
          console.log('skipping large blob', data._id, Math.round(blob.size / 1024 / 1024))
        }
      }

      processedCnt += 1
      processedBytes += blob.size

      if (processedCnt % 100 === 0) {
        await rateLimiter.waitProcessing()

        const duration = Date.now() - time

        console.log(
          '...processed',
          processedCnt,
          Math.round(processedBytes / 1024 / 1024) + 'MB',
          'moved',
          movedCnt,
          Math.round(movedBytes / 1024 / 1024) + 'MB',
          '+' + Math.round(batchBytes / 1024 / 1024) + 'MB',
          'skipped',
          skippedCnt,
          Math.round(duration / 1000) + 's'
        )

        batchBytes = 0
        time = Date.now()
      }
    }

    await rateLimiter.waitProcessing()
  } finally {
    await iterator.close()
  }
}

async function processFile (
  ctx: MeasureContext,
  exAdapter: StorageAdapterEx,
  adapter: StorageAdapter,
  workspaceId: WorkspaceId,
  blob: Blob
): Promise<void> {
  const readable = await adapter.get(ctx, workspaceId, blob._id)
  try {
    readable.on('end', () => {
      readable.destroy()
    })
    const stream = readable.pipe(new PassThrough())
    await exAdapter.put(ctx, workspaceId, blob._id, stream, blob.contentType, blob.size)
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
