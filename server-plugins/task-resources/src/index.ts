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

import { Class, Doc, Ref, Space, Tx, TxCreateDoc, TxProcessor, TxUpdateDoc } from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import core from '@hcengineering/core/lib/component'
import task, { KanbanTemplateSpace, KanbanTemplate, StateTemplate, State, DoneState } from '@hcengineering/task'

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
  const prevDoc = TxProcessor.buildDoc2Doc(
    [...createTxes, ...txes, ...updateTxes].filter((t) => t._id !== tx._id)
  ) as StateTemplate
  if (prevDoc === undefined) return []
  const templateSpace = (
    await control.findAll(task.class.KanbanTemplateSpace, {
      _id: actualTx.objectSpace as Ref<KanbanTemplateSpace>
    })
  )[0] as KanbanTemplateSpace
  if (templateSpace === undefined) return []
  const template = (await control.findAll(task.class.KanbanTemplate, { _id: prevDoc.attachedTo }))[0] as KanbanTemplate
  const classToChange = getClassToChangeOrCreate(actualTx.objectClass)
  const objectWithStatesToChange = await control.findAll(templateSpace.attachedToClass, { templateId: template._id })
  const ids = Array.from(objectWithStatesToChange.map((x) => x._id)) as Array<Ref<Space>>
  const newDoc = TxProcessor.buildDoc2Doc([...createTxes, ...txes, ...updateTxes]) as StateTemplate
  const statesToChange = Array.from(
    await control.findAll(classToChange, { space: { $in: ids }, name: prevDoc.name })
  ) as Array<State | DoneState>
  return statesToChange.map((it) => {
    const newAttributes = it._class === task.class.State ? { color: newDoc.color, rank: newDoc.rank } : {}
    return control.txFactory.createTxUpdateDoc(it._class, it.space, it._id, {
      name: newDoc.name,
      ...newAttributes
    })
  })
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
  const objectWithStatesToChange = await control.findAll(templateSpace.attachedToClass, { templateId: template?._id })
  const ids = Array.from(objectWithStatesToChange.map((x) => x._id)) as Array<Ref<Space>>
  const doc = TxProcessor.createDoc2Doc(actualTx)
  const ofAttribute = classToChange === task.class.State ? task.attribute.State : task.attribute.DoneState
  return ids.map((it) => {
    const newAttributes = classToChange === task.class.State ? { color: doc.color, rank: doc.rank } : {}
    return control.txFactory.createTxCreateDoc(classToChange, it, {
      ofAttribute,
      name: doc.name,
      ...newAttributes
    })
  })
}

function getClassToChangeOrCreate (check: Ref<Class<Doc>>): Ref<Class<Doc>> {
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
