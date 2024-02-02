//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import type { CollaborativeDoc, CollaborativeDocWithHistory, Doc, Tx, TxRemoveDoc } from '@hcengineering/core'
import core, { TxProcessor } from '@hcengineering/core'
import type { TriggerControl } from '@hcengineering/server-core'

/**
 * @public
 */
export async function OnDelete (
  tx: Tx,
  { hierarchy, storageFx, removedMap }: TriggerControl
): Promise<Tx[]> {
  const rmTx = TxProcessor.extractTx(tx) as TxRemoveDoc<Doc>

  // Obtain document being deleted
  const doc = removedMap.get(rmTx.objectId)

  // Ids of files to delete from storage
  const toDelete: string[] = []

  const attributes = hierarchy.getAllAttributes(rmTx.objectClass)
  for (const attribute of attributes.values()) {
    if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDocWithHistory)) {
      const value = (doc as any)[attribute.name] as CollaborativeDocWithHistory
      toDelete.push(value.collaborativeId)
      toDelete.push(value.historyId)
    } else if (hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)) {
      const value = (doc as any)[attribute.name] as CollaborativeDoc
      toDelete.push(value.collaborativeId)
    }
  }

  storageFx(async (adapter, bucket) => {
    // TODO This is not accurate way to delete collaborative document
    // Even though we are deleting it here, the document can be currently in use by someone else
    // and when editing session ends, the collborator service will recreate the document again
    await adapter.remove(bucket, toDelete)
  })

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnDelete
  }
})
