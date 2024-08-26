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
import { type StorageAdapterEx } from '@hcengineering/server-core'
import { PassThrough } from 'stream'

export async function moveFiles (
  ctx: MeasureContext,
  workspaceId: WorkspaceId,
  exAdapter: StorageAdapterEx,
  params: {
    blobSizeLimitMb: number
    concurrency: number
  }
): Promise<void> {
  if (exAdapter.adapters === undefined) return

  let count = 0

  console.log('start', workspaceId.name)

  // We assume that the adapter moves all new files to the default adapter
  const target = exAdapter.defaultAdapter
  await exAdapter.adapters.get(target)?.make(ctx, workspaceId)

  for (const [name, adapter] of exAdapter.adapters.entries()) {
    if (name === target) continue
    console.log('moving from', name, 'limit', params.blobSizeLimitMb, 'concurrency', params.concurrency)

    let time = Date.now()

    const rateLimiter = new RateLimiter(params.concurrency)

    const iterator = await adapter.listStream(ctx, workspaceId)
    while (true) {
      const data = await iterator.next()
      if (data === undefined) break

      const blob = await exAdapter.stat(ctx, workspaceId, data._id)
      if (blob === undefined) continue
      if (blob.provider === target) continue

      if (blob.size > params.blobSizeLimitMb * 1024 * 1024) {
        console.log('skipping large blob', name, data._id, Math.round(blob.size / 1024 / 1024))
        continue
      }

      await rateLimiter.add(async () => {
        try {
          await retryOnFailure(
            ctx,
            5,
            async () => {
              await moveFile(ctx, exAdapter, workspaceId, blob)
            },
            50
          )
        } catch (err) {
          console.error('failed to process blob', name, data._id, err)
        }
      })

      count += 1
      if (count % 100 === 0) {
        await rateLimiter.waitProcessing()
        const duration = Date.now() - time
        time = Date.now()
        console.log('...moved: ', count, Math.round(duration / 1000))
      }
    }

    await rateLimiter.waitProcessing()

    await iterator.close()
  }

  console.log('...done', workspaceId.name, count)
}

async function moveFile (
  ctx: MeasureContext,
  exAdapter: StorageAdapterEx,
  workspaceId: WorkspaceId,
  blob: Blob
): Promise<void> {
  const readable = await exAdapter.get(ctx, workspaceId, blob._id)
  try {
    readable.on('end', () => {
      readable.destroy()
    })
    const stream = readable.pipe(new PassThrough())
    await exAdapter.put(ctx, workspaceId, blob._id, stream, blob.contentType, blob.size)
  } catch (err) {
    readable.destroy()
    throw err
  }
}

async function retryOnFailure<T> (
  ctx: MeasureContext,
  retries: number,
  op: () => Promise<T>,
  delay: number = 0
): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      ctx.error('error', { err, retries })
      if (retries !== 0 && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
