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

import { MeasureContext, WorkspaceId } from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { Doc as YDoc } from 'yjs'

import { yDocFromBuffer, yDocToBuffer } from './ydoc'

/** @public */
export async function yDocFromStorage (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  documentId: string,
  ydoc?: YDoc
): Promise<YDoc | undefined> {
  // stat the object to ensure it exists, because read will throw an error in this case
  const blob = await storageAdapter.stat(ctx, workspace, documentId)
  if (blob === undefined) {
    return undefined
  }

  // no need to apply gc because we load existing document
  // it is either already gc-ed, or gc not needed and it is disabled
  ydoc ??= new YDoc({ gc: false })

  const buffer = await storageAdapter.read(ctx, workspace, documentId)
  return yDocFromBuffer(Buffer.concat(buffer), ydoc)
}

/** @public */
export async function yDocToStorage (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  documentId: string,
  ydoc: YDoc
): Promise<void> {
  const buffer = yDocToBuffer(ydoc)
  await storageAdapter.put(ctx, workspace, documentId, buffer, 'application/ydoc', buffer.length)
}
