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

import type { CollaborativeDoc, Doc, Tx, TxRemoveDoc, WorkspaceDataId } from '@hcengineering/core'
import core, { makeCollabId, makeCollabYdocId } from '@hcengineering/core'
import { type TriggerControl } from '@hcengineering/server-core'

/**
 * @public
 */
export async function OnDelete (
  txes: Tx[],
  { hierarchy, storageAdapter, workspace, removedMap, ctx }: TriggerControl
): Promise<Tx[]> {
  const ltxes = txes.filter((it) => it._class === core.class.TxRemoveDoc) as TxRemoveDoc<Doc>[]
  for (const rmTx of ltxes) {
    // Obtain document being deleted
    const doc = removedMap.get(rmTx.objectId)
    if (doc === undefined) {
      continue
    }

    // Ids of files to delete from storage
    const toDelete: CollaborativeDoc[] = []

    const attributes = hierarchy.getAllAttributes(rmTx.objectClass)
    for (const attribute of attributes.values()) {
      if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
        toDelete.push(makeCollabId(doc._class, doc._id, attribute.name))
      }
    }

    // TODO This is not accurate way to delete collaborative document
    // Even though we are deleting it here, the document can be currently in use by someone else
    // and when editing session ends, the collborator service will recreate the document again
    if (toDelete.length > 0) {
      const toRemove: string[] = toDelete.map(makeCollabYdocId)
      if (toRemove.length > 0) {
        await ctx.with('remove', {}, async () => {
          const dataId = workspace.dataId ?? (workspace.uuid as unknown as WorkspaceDataId)
          await storageAdapter.remove(ctx, dataId, toRemove)
        })
      }
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnDelete
  }
})
