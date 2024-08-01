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

import { type Blob, type MeasureContext, type WorkspaceId } from '@hcengineering/core'
import { type StorageAdapterEx } from '@hcengineering/server-core'
import { type Db } from 'mongodb'
import { PassThrough } from 'stream'

export async function moveFiles (
  ctx: MeasureContext,
  db: Db,
  workspaceId: WorkspaceId,
  exAdapter: StorageAdapterEx,
  provider: string,
  remove: boolean
): Promise<void> {
  const adapter = exAdapter.adapters?.get(provider)
  if (adapter === undefined) {
    throw new Error(`storage provider ${provider} not found`)
  }

  // Ensure the workspace exists in the storage
  await adapter.make(ctx, workspaceId)

  const collection = db.collection<Blob>('blob')
  const blobs = await collection.find({ provider: { $ne: provider } }).toArray()

  let count = 0
  for (const blob of blobs) {
    const readable = await exAdapter.get(ctx, workspaceId, blob._id)
    const passThrough = new PassThrough()
    readable.pipe(passThrough)
    const info = await adapter.put(ctx, workspaceId, blob._id, passThrough, blob.contentType, blob.size)

    await collection.updateOne({ _id: blob._id }, { $set: { provider, ...info } })
    if (remove) {
      await exAdapter.adapters?.get(blob.provider)?.remove(ctx, workspaceId, [blob._id])
    }

    count += 1
    if (count % 100 === 0) {
      console.log('...moved: ', count, '/', blobs.length)
    }
  }

  console.log('files moved for workspace', workspaceId.name, count)
}
