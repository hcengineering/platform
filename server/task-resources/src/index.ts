//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { Tx, TxFactory, Doc, TxCreateDoc, TxRemoveDoc, TxCollectionCUD, AttachedDoc } from '@anticrm/core'
import type { FindAll } from '@anticrm/server-core'

import core, { Hierarchy } from '@anticrm/core'
import task, { Kanban, Task, State } from '@anticrm/task'

/**
 * @public
 */
export async function OnTask (tx: Tx, txFactory: TxFactory, findAll: FindAll<Doc>, hierarchy: Hierarchy): Promise<Tx[]> {
  if (tx._class === core.class.TxCollectionCUD) {
    tx = (tx as TxCollectionCUD<Doc, AttachedDoc>).tx
  }

  if (hierarchy.isDerived(tx._class, core.class.TxCreateDoc)) {
    const createTx = tx as TxCreateDoc<Task>
    if (hierarchy.isDerived(createTx.objectClass, task.class.Task)) {
      const state = (await (findAll as FindAll<State>)(task.class.State, { space: createTx.objectSpace }))[0] // TODO: make FindAll generic
      if (state === undefined) {
        throw new Error('OnTask: state not found')
      }
      const kanban = (await (findAll as FindAll<Kanban>)(task.class.Kanban, { attachedTo: createTx.objectSpace }))[0]
      if (kanban === undefined) {
        throw new Error('OnTask: kanban not found')
      }
      return [
        txFactory.createTxUpdateDoc(createTx.objectClass, createTx.objectSpace, createTx.objectId, { state: state._id }),
        txFactory.createTxUpdateDoc(task.class.Kanban, createTx.objectSpace, kanban._id, { $push: { order: createTx.objectId } })
      ]
    }
  } else if (tx._class === core.class.TxRemoveDoc) {
    const removeTx = tx as TxRemoveDoc<Task>
    if (hierarchy.isDerived(removeTx.objectClass, task.class.Task)) {
      const kanban = (await (findAll as FindAll<Kanban>)(task.class.Kanban, { attachedTo: removeTx.objectSpace }))[0]
      if (kanban === undefined) {
        throw new Error('OnTask: kanban not found')
      }
      return [
        txFactory.createTxUpdateDoc(task.class.Kanban, removeTx.objectSpace, kanban._id, { $pull: { order: removeTx.objectId } })
      ]
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnTask
  }
})
