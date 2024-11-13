//
// Copyright © 2022 Hardcore Engineering Inc.
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

import core, { Doc, Tx, TxCUD, TxCreateDoc, TxProcessor, TxUpdateDoc } from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import task, { Task } from '@hcengineering/task'

/**
 * @public
 */
export async function OnStateUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = TxProcessor.extractTx(tx) as TxCUD<Doc>
    if (!control.hierarchy.isDerived(actualTx.objectClass, task.class.Task)) {
      continue
    }
    if (actualTx._class === core.class.TxCreateDoc) {
      const doc = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Task>)
      const status = control.modelDb.findAllSync(core.class.Status, { _id: doc.status })[0]
      if (status?.category === task.statusCategory.Lost || status?.category === task.statusCategory.Won) {
        result.push(control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, { isDone: true }))
      }
    } else if (actualTx._class === core.class.TxUpdateDoc) {
      const updateTx = actualTx as TxUpdateDoc<Task>
      if (updateTx.operations.status !== undefined) {
        const status = control.modelDb.findAllSync(core.class.Status, { _id: updateTx.operations.status })[0]
        if (status?.category === task.statusCategory.Lost || status?.category === task.statusCategory.Won) {
          result.push(
            control.txFactory.createTxUpdateDoc(updateTx.objectClass, updateTx.objectSpace, updateTx.objectId, {
              isDone: true
            })
          )
        } else {
          result.push(
            control.txFactory.createTxUpdateDoc(updateTx.objectClass, updateTx.objectSpace, updateTx.objectId, {
              isDone: false
            })
          )
        }
      }
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {},
  trigger: {
    OnStateUpdate
  }
})
