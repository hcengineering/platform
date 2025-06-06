//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { retry } from '@hcengineering/communication-shared'
import { StorageAdapter, UploadedObjectInfo } from '@hcengineering/server-core'
import { MeasureContext } from '@hcengineering/core'
import { BlobID, WorkspaceID } from '@hcengineering/communication-types'
import { type Readable } from 'stream'

export async function getFile (
  storage: StorageAdapter,
  ctx: MeasureContext,
  workspace: WorkspaceID,
  blob: BlobID
): Promise<Readable> {
  return await retry(() => storage.get(ctx, { uuid: workspace } as any, blob), { retries: 3 })
}

export async function removeFile (
  storage: StorageAdapter,
  ctx: MeasureContext,
  workspace: WorkspaceID,
  blob: BlobID
): Promise<void> {
  await retry(() => storage.remove(ctx, { uuid: workspace } as any, [blob]), { retries: 3 })
}

export async function uploadFile (
  storage: StorageAdapter,
  ctx: MeasureContext,
  workspace: WorkspaceID,
  blob: BlobID,
  content: Readable | string
): Promise<UploadedObjectInfo> {
  return await retry(async () => await storage.put(ctx, { uuid: workspace } as any, blob, content, 'text/yaml'), {
    retries: 3
  })
}
