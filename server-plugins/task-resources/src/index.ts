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

import {
  Attribute,
  Class,
  Data,
  Doc,
  Ref,
  Space,
  Status,
  Tx,
  TxCreateDoc,
  TxProcessor,
  TxUpdateDoc,
  generateId
} from '@hcengineering/core'
import core from '@hcengineering/core/lib/component'
import { TriggerControl } from '@hcengineering/server-core'
import task, {
  DoneState,
  KanbanTemplate,
  KanbanTemplateSpace,
  SpaceWithStates,
  State,
  StateTemplate,
  Task
} from '@hcengineering/task'

async function updateStatesName (
  tx: Tx,
  isDone: boolean,
  templateSpace: KanbanTemplateSpace,
  doc: StateTemplate,
  classToChange: Ref<Class<State | DoneState>>,
  ofAttribute: Ref<Attribute<Status>>,
  txes: Tx[],
  exists: Status,
  control: TriggerControl
): Promise<Tx[]> {
  const result: Tx[] = []
  const prevDoc = TxProcessor.buildDoc2Doc(txes.filter((t) => t._id !== tx._id)) as StateTemplate
  if (prevDoc === undefined) return []
  const query = { name: doc.name ?? (doc as any).title, ofAttribute }
  const field = isDone ? 'doneStates' : ('states' as keyof Pick<SpaceWithStates, 'doneStates' | 'states'>)
  const template = (await control.findAll(task.class.KanbanTemplate, { _id: prevDoc.attachedTo }))[0] as KanbanTemplate
  const spacesWithStatesToChange = await control.findAll(templateSpace.attachedToClass, { templateId: template._id })
  const taskField = isDone ? 'doneState' : ('status' as keyof Pick<Task, 'doneState' | 'status'>)
  // for outdated transaction (they were not migrated)
  const oldQuery = { name: prevDoc.name ?? (prevDoc as any).title, ofAttribute }
  const oldStatus = (await control.findAll(classToChange, oldQuery))[0]
  if (oldStatus === undefined) return []
  const id = exists?._id ?? generateId()
  if (exists === undefined) {
    const data: Data<State> = {
      ...query,
      ...(!isDone ? { color: doc.color } : {})
    }
    result.push(control.txFactory.createTxCreateDoc(classToChange, task.space.Statuses, data, id))
  }
  const spaces = Array.from(spacesWithStatesToChange.map((x) => x._id)) as Array<Ref<Space>>
  for (const space of spacesWithStatesToChange) {
    if (space[field]?.includes(oldStatus._id) === true && space[field]?.includes(id) !== true) {
      result.push(
        control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
          $pull: { [field]: oldStatus._id }
        })
      )
      result.push(
        control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
          $push: { [field]: id }
        })
      )
    }
  }
  const tasks = await control.findAll(task.class.Task, { [taskField]: oldStatus._id, space: { $in: spaces } })
  tasks.forEach((task) => {
    result.push(
      control.txFactory.createTxUpdateDoc(task._class, task.space, task._id, {
        [taskField]: id
      })
    )
  })
  return result
}

async function updateStatesColor (exists: Status, control: TriggerControl, color: number): Promise<Tx[]> {
  if (exists !== undefined) {
    return [
      control.txFactory.createTxUpdateDoc(exists._class, exists.space, exists._id, {
        color
      })
    ]
  }
  return []
}

/**
 * @public
 */
export async function OnTemplateStateUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = tx as TxUpdateDoc<StateTemplate>
  const txes = await control.findAll(core.class.TxCollectionCUD, {
    'tx.objectId': actualTx.objectId
  })
  const createTxes = await control.findAll(core.class.TxCreateDoc, { objectId: actualTx.objectId })
  const updateTxes = await control.findAll(core.class.TxUpdateDoc, { objectId: actualTx.objectId })

  const templateSpace = (
    await control.findAll(task.class.KanbanTemplateSpace, {
      _id: actualTx.objectSpace as Ref<KanbanTemplateSpace>
    })
  )[0] as KanbanTemplateSpace
  if (templateSpace === undefined) return []
  const allTxes = [...createTxes, ...txes, ...updateTxes]
  const doc = TxProcessor.buildDoc2Doc(allTxes) as StateTemplate

  const classToChange = getClassToChangeOrCreate(actualTx.objectClass)
  const isDone = control.hierarchy.isDerived(classToChange, task.class.DoneState)
  const ofAttribute =
    doc.ofAttribute ?? (isDone ? templateSpace.doneAttribute ?? templateSpace.ofAttribute : templateSpace.ofAttribute)
  const query = { name: doc.name ?? (doc as any).title, ofAttribute }
  const exists = (await control.findAll(classToChange, query))[0]
  if (actualTx.operations.name !== undefined) {
    return await updateStatesName(tx, isDone, templateSpace, doc, classToChange, ofAttribute, allTxes, exists, control)
  } else if (actualTx.operations.color !== undefined) {
    return await updateStatesColor(exists, control, actualTx.operations.color)
  }
  return []
}

/**
 * @public
 */
export async function OnTemplateStateCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = tx as TxCreateDoc<StateTemplate>
  const templateSpace = (
    await control.findAll(task.class.KanbanTemplateSpace, {
      _id: actualTx.objectSpace as Ref<KanbanTemplateSpace>
    })
  )[0] as KanbanTemplateSpace
  if (templateSpace === undefined) return []
  const template = (
    await control.findAll(task.class.KanbanTemplate, { _id: actualTx.attributes.attachedTo })
  )[0] as KanbanTemplate
  const classToChange = getClassToChangeOrCreate(actualTx.objectClass)
  const spacesWithStatesToChange = await control.findAll(templateSpace.attachedToClass, { templateId: template?._id })
  const doc = TxProcessor.createDoc2Doc(actualTx)
  const isDone = control.hierarchy.isDerived(classToChange, task.class.DoneState)
  const query = { name: doc.name, ofAttribute: doc.ofAttribute }
  const field = isDone ? 'doneStates' : 'states'
  const exists = (await control.findAll(classToChange, query))[0]
  if (exists !== undefined) {
    return spacesWithStatesToChange
      .filter((it) => it[field]?.includes(exists._id) !== true)
      .map((it) => {
        return control.txFactory.createTxUpdateDoc(it._class, it.space, it._id, {
          $push: { [field]: exists._id }
        })
      })
  } else {
    const id = generateId()
    const stateTx = control.txFactory.createTxCreateDoc(
      classToChange,
      task.space.Statuses,
      {
        ...query,
        ...(!isDone ? { color: doc.color } : {})
      },
      id
    )
    const spaceTxes = spacesWithStatesToChange.map((it) => {
      return control.txFactory.createTxUpdateDoc(it._class, it.space, it._id, {
        $push: { [field]: id }
      })
    })
    return [stateTx, ...spaceTxes]
  }
}

function getClassToChangeOrCreate (check: Ref<Class<Doc>>): Ref<Class<State | DoneState>> {
  let classToChange = task.class.State
  switch (check) {
    case task.class.WonStateTemplate:
      classToChange = task.class.WonState
      break
    case task.class.LostStateTemplate:
      classToChange = task.class.LostState
      break
  }
  return classToChange
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {},
  trigger: {
    OnTemplateStateUpdate,
    OnTemplateStateCreate
  }
})
