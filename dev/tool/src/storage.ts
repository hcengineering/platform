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

import { type MeasureContext, type WorkspaceId } from '@hcengineering/core'
import { type StorageAdapterEx } from '@hcengineering/server-core'
import { PassThrough } from 'stream'

export async function moveFiles (
  ctx: MeasureContext,
  workspaceId: WorkspaceId,
  exAdapter: StorageAdapterEx
): Promise<void> {
  if (exAdapter.adapters === undefined) return

  let count = 0

  console.log('start', workspaceId.name)

  // We assume that the adapter moves all new files to the default adapter
  const target = exAdapter.defaultAdapter
  await exAdapter.adapters.get(target)?.make(ctx, workspaceId)

  for (const [name, adapter] of exAdapter.adapters.entries()) {
    if (name === target) continue

    const iterator = await adapter.listStream(ctx, workspaceId)
    while (true) {
      const data = await iterator.next()
      if (data === undefined) break

      const blob = await exAdapter.stat(ctx, workspaceId, data._id)
      if (blob === undefined) continue
      if (blob.provider === target) continue

      const readable = await exAdapter.get(ctx, workspaceId, data._id)
      const stream = readable.pipe(new PassThrough())
      await exAdapter.put(ctx, workspaceId, data._id, stream, blob.contentType, blob.size)

      count += 1
      if (count % 100 === 0) {
        console.log('...moved: ', count)
      }
    }
    await iterator.close()
  }

  console.log('...done', workspaceId.name, count)
}
