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

import {
  type Class,
  type Doc,
  type Hierarchy,
  type Ref,
  type Tx,
  type TxRemoveDoc,
  DocumentQuery,
  FindOptions,
  FindResult,
  type WorkspaceDataId
} from '@hcengineering/core'
import drive, { type FileVersion, type Folder } from '@hcengineering/drive'
import type { TriggerControl } from '@hcengineering/server-core'

/** @public */
export async function OnFileVersionDelete (
  txes: Tx[],
  { removedMap, ctx, storageAdapter, workspace }: TriggerControl
): Promise<Tx[]> {
  const result: Tx[] = []
  const toDelete: string[] = []
  for (const tx of txes) {
    const rmTx = tx as TxRemoveDoc<FileVersion>

    // Obtain document being deleted.
    const version = removedMap.get(rmTx.objectId) as FileVersion
    if (version !== undefined) {
      toDelete.push(version.file)
    }
  }
  if (toDelete.length > 0) {
    const dataId = workspace.dataId ?? (workspace.uuid as unknown as WorkspaceDataId)
    await storageAdapter.remove(ctx, dataId, toDelete)
  }

  return result
}

/** @public */
export async function FindFolderResources (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  const folder = doc as Folder

  const files = await findAll(drive.class.File, { parent: folder._id })
  const folders = await findAll(drive.class.Folder, { parent: folder._id })
  return [...files, ...folders]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnFileVersionDelete
  },
  function: {
    FindFolderResources
  }
})
