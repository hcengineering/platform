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

import type { Plugin, Asset, Resource, IntlString } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { Ref, Mixin, UXObject, Space, FindOptions, Class, Doc, Arr, State, Client, Obj } from '@anticrm/core'

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
export interface BaseKanban extends Doc {
  states: Arr<Ref<State>>
}

/**
 * @public
 */
export interface Kanban extends BaseKanban {
  attachedTo: Ref<Space>
  states: Arr<Ref<State>>
  order: Arr<Ref<Doc>>
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
export interface KanbanTemplate extends BaseKanban {
  title: string
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

export default plugin(viewId, {
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
    BaseKanban: '' as Ref<Class<BaseKanban>>,
    Kanban: '' as Ref<Class<Kanban>>,
    Sequence: '' as Ref<Class<Sequence>>,
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
