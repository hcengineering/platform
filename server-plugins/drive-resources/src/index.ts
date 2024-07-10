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
  TxProcessor,
  DocumentQuery,
  FindOptions,
  FindResult
} from '@hcengineering/core'
import drive, { FileVersion, type File, type Folder } from '@hcengineering/drive'
import type { TriggerControl } from '@hcengineering/server-core'

/** @public */
export async function OnFileDelete (
  tx: Tx,
  { removedMap, txFactory }: TriggerControl
): Promise<Tx[]> {
  const rmTx = TxProcessor.extractTx(tx) as TxRemoveDoc<File>

  const res: Tx[] = []

  const file = removedMap.get(rmTx.objectId) as File
  if (file !== undefined) {
    for (const version of file.versions) {
      const removeTx = txFactory.createTxRemoveDoc(drive.class.FileVersion, file.space, version)
      res.push(removeTx)
    }
  }

  return res
}

/** @public */
export async function OnFileVersionDelete (
  tx: Tx,
  { removedMap, ctx, storageAdapter, workspace }: TriggerControl
): Promise<Tx[]> {
  const rmTx = TxProcessor.extractTx(tx) as TxRemoveDoc<FileVersion>

  // Obtain document being deleted.
  const version = removedMap.get(rmTx.objectId) as FileVersion
  if (version !== undefined) {
    await storageAdapter.remove(ctx, workspace, [version.file])
  }

  return []
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
    OnFileDelete,
    OnFileVersionDelete
  },
  function: {
    FindFolderResources
  }
})
