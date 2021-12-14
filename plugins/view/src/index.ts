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

import core from '@anticrm/core'
import type { Plugin, Asset, Resource, IntlString } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { Ref, Mixin, UXObject, Space, FindOptions, Class, Doc, Arr, State, Client, Obj, DoneState, AttachedDoc, WonState, LostState, TxOperations } from '@anticrm/core'

import type { AnyComponent, AnySvelteComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface AttributeEditor extends Class<Doc> {
  editor: AnyComponent
}

/**
 * @public
 */
export interface AttributePresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export interface KanbanCard extends Class<Doc> {
  card: AnyComponent
}

/**
 * @public
 */
export interface ObjectEditor extends Class<Doc> {
  editor: AnyComponent
}

/**
 * @public
 */
export interface ViewletDescriptor extends Doc, UXObject {
  component: AnyComponent
}

/**
 * @public
 */
export interface Viewlet extends Doc {
  attachTo: Ref<Class<Space>>
  descriptor: Ref<ViewletDescriptor>
  open: AnyComponent
  options?: FindOptions<Doc>
  config: any
}

/**
 * @public
 */
export interface Action extends Doc, UXObject {
  action: Resource<(doc: Doc) => Promise<void>>
}

/**
 * @public
 */
export interface ActionTarget extends Doc {
  target: Ref<Class<Doc>>
  action: Ref<Action>
}

/**
 * @public
 */
export interface Sequence extends Doc {
  attachedTo: Ref<Class<Doc>>
  sequence: number
}

/**
 * @public
 */
export interface Kanban extends Doc {
  attachedTo: Ref<Space>
  states: Arr<Ref<State>>
  doneStates: Arr<Ref<DoneState>>
  order: Arr<Ref<Doc>>
}

/**
 * @public
 */
export interface StateTemplate extends AttachedDoc, State {}

/**
 * @public
 */
export interface DoneStateTemplate extends AttachedDoc, DoneState {}

/**
 * @public
 */
export interface WonStateTemplate extends DoneStateTemplate, WonState {}

/**
 * @public
 */
export interface LostStateTemplate extends DoneStateTemplate, LostState {}

/**
 * @public
 */
export interface KanbanTemplate extends Doc {
  title: string
  states: Arr<Ref<StateTemplate>>
  doneStates: Arr<Ref<DoneStateTemplate>>
  statesC: number
  doneStatesC: number
}

/**
 * @public
 */
export interface KanbanTemplateSpace extends Space {
  icon: AnyComponent
}

/**
 * @public
 */
export const viewId = 'view' as Plugin

/**
 * @public
 */
export type BuildModelKey = string | {
  presenter: AnyComponent
  label: string
}

/**
 * @public
 */
export interface AttributeModel {
  key: string
  label: IntlString
  _class: Ref<Class<Doc>>
  presenter: AnySvelteComponent
  // Extra properties for component
  props?: Record<string, any>
}

/**
 * @public
 */
export interface BuildModelOptions {
  client: Client
  _class: Ref<Class<Obj>>
  keys: BuildModelKey[]
  options?: FindOptions<Doc>
  ignoreMissing?: boolean
}

/**
 * @public
 */
const view = plugin(viewId, {
  mixin: {
    AttributeEditor: '' as Ref<Mixin<AttributeEditor>>,
    AttributePresenter: '' as Ref<Mixin<AttributePresenter>>,
    KanbanCard: '' as Ref<Mixin<KanbanCard>>,
    ObjectEditor: '' as Ref<Mixin<ObjectEditor>>
  },
  class: {
    ViewletDescriptor: '' as Ref<Class<ViewletDescriptor>>,
    Viewlet: '' as Ref<Class<Viewlet>>,
    Action: '' as Ref<Class<Action>>,
    ActionTarget: '' as Ref<Class<ActionTarget>>,
    Kanban: '' as Ref<Class<Kanban>>,
    Sequence: '' as Ref<Class<Sequence>>,
    StateTemplate: '' as Ref<Class<StateTemplate>>,
    DoneStateTemplate: '' as Ref<Class<DoneStateTemplate>>,
    WonStateTemplate: '' as Ref<Class<WonStateTemplate>>,
    LostStateTemplate: '' as Ref<Class<LostStateTemplate>>,
    KanbanTemplate: '' as Ref<Class<KanbanTemplate>>,
    KanbanTemplateSpace: '' as Ref<Class<KanbanTemplateSpace>>
  },
  viewlet: {
    Table: '' as Ref<ViewletDescriptor>,
    Kanban: '' as Ref<ViewletDescriptor>
  },
  space: {
    Sequence: '' as Ref<Space>
  },
  icon: {
    Table: '' as Asset,
    Kanban: '' as Asset,
    Delete: '' as Asset,
    Move: '' as Asset
  },
  string: {
    Delete: '' as IntlString
  }
})
export default view

/**
 * @public
 */
export async function createKanban (client: Client & TxOperations, attachedTo: Ref<Space>, templateId?: Ref<KanbanTemplate>): Promise<Ref<Kanban>> {
  if (templateId === undefined) {
    return await client.createDoc(view.class.Kanban, attachedTo, {
      attachedTo,
      states: [],
      doneStates: await Promise.all([
        client.createDoc(core.class.WonState, attachedTo, {
          title: 'Won'
        }),
        client.createDoc(core.class.LostState, attachedTo, {
          title: 'Lost'
        })
      ]),
      order: []
    })
  }

  const template = await client.findOne(view.class.KanbanTemplate, { _id: templateId })

  if (template === undefined) {
    throw Error(`Failed to find target kanban template: ${templateId}`)
  }

  const tmplStates = await client.findAll(view.class.StateTemplate, { attachedTo: template._id })
  const states = await Promise.all(
    template.states
      .map((id) => tmplStates.find((x) => x._id === id))
      .filter((tstate): tstate is StateTemplate => tstate !== undefined)
      .map(async (state) => await client.createDoc(core.class.State, attachedTo, { color: state.color, title: state.title }))
  )

  const doneClassMap = new Map<Ref<Class<DoneStateTemplate>>, Ref<Class<DoneState>>>([
    [view.class.WonStateTemplate, core.class.WonState],
    [view.class.LostStateTemplate, core.class.LostState]
  ])
  const tmplDoneStates = await client.findAll(view.class.DoneStateTemplate, { attachedTo: template._id })
  const doneStates = (await Promise.all(
    template.doneStates
      .map((id) => tmplDoneStates.find((x) => x._id === id))
      .filter((tstate): tstate is DoneStateTemplate => tstate !== undefined)
      .map(async (state) => {
        const cl = doneClassMap.get(state._class)

        if (cl === undefined) {
          return
        }

        return await client.createDoc(cl, attachedTo, { title: state.title })
      })
  )).filter((x): x is Ref<DoneState> => x !== undefined)

  return await client.createDoc(view.class.Kanban, attachedTo, {
    attachedTo,
    states,
    doneStates,
    order: []
  })
}
