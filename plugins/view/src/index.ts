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

import type {
  AnyAttribute,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  Mixin,
  Obj,
  Ref,
  Space,
  UXObject
} from '@anticrm/core'
import type { Asset, IntlString, Plugin, Resource, Status } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
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
export interface ObjectEditor extends Class<Doc> {
  editor: AnyComponent
}

/**
 * @public
 */
export interface SpaceHeader extends Class<Doc> {
  header: AnyComponent
}

/**
 * @public
 */
export interface ObjectEditorHeader extends Class<Doc> {
  editor: AnyComponent
}

/**
 * @public
 */
export interface ObjectValidator extends Class<Doc> {
  validator: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status>>
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
  options?: FindOptions<Doc>
  config: any
}

/**
 * @public
 *
 *  "Alt + K" =\> Alt and K should be pressed together
 *  "J T" - J and then T shold be pressed.
 */
export type KeyBinding = string

/**
 * @public
 */
export type ViewAction = Resource<(doc: Doc | Doc[] | undefined, evt: Event) => Promise<void>>
/**
 * @public
 */
export interface Action extends Doc, UXObject {
  keyBinding?: KeyBinding[]
  action: ViewAction

  // If specified, action could be used only with one item selected.
  // By default it is treated as false
  singleInput?: boolean
}

/**
 * Define action to 'object' mapping.
 * @public
 */
export interface ActionTarget<T extends Doc = Doc> extends Doc {
  target: Ref<Class<T>>
  action: Ref<Action>
  query?: DocumentQuery<T>
  context: ViewContext

  // If specified, will be used instead of action from Action.
  override?: ViewAction
}

/**
 * @public
 *  workbench - global actions per application or entire workbench.
 *  browser - actions for list/table/kanban browsing.
 *  editor - actions for selected editor context.
 *  context - only for context menu actions.
 */
export type ViewContextType = 'context' | 'workbench' | 'browser' | 'editor' | 'panel' | 'popup' | 'context'

/**
 * @public
 */
export interface ViewContext {
  mode: ViewContextType | ViewContextType[]
  // Active application
  application?: Ref<Doc>
  // Optional groupping
  group?: string
}

/**
 * @public
 */
export interface IgnoreActions extends Class<Doc> {
  actions: Ref<Action>[]
}

/**
 * @public
 */
export interface HTMLPresenter extends Class<Doc> {
  presenter: Resource<(doc: Doc) => string>
}

/**
 * @public
 */
export interface TextPresenter extends Class<Doc> {
  presenter: Resource<(doc: Doc) => string>
}

/**
 * @public
 */
export interface PreviewPresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export const viewId = 'view' as Plugin

/**
 * @public
 */
export interface BuildModelKey {
  key: string
  presenter?: AnyComponent
  // A set of extra props passed to presenter.
  props?: Record<string, any>

  label?: IntlString
  sortingKey?: string

  // On client sorting function
  sortingFunction?: (a: Doc, b: Doc) => number
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
  sortingKey: string
  // Extra icon if applicable
  icon?: Asset

  attribute?: AnyAttribute
}

/**
 * @public
 */
export interface BuildModelOptions {
  client: Client
  _class: Ref<Class<Obj>>
  keys: (BuildModelKey | string)[]
  options?: FindOptions<Doc>
  ignoreMissing?: boolean
}

/**
 * Define document create popup widget
 *
 * @public
 *
 */
export interface ObjectFactory extends Class<Obj> {
  component: AnyComponent
}

/**
 * @public
 */
const view = plugin(viewId, {
  mixin: {
    AttributeEditor: '' as Ref<Mixin<AttributeEditor>>,
    AttributePresenter: '' as Ref<Mixin<AttributePresenter>>,
    ObjectEditor: '' as Ref<Mixin<ObjectEditor>>,
    ObjectEditorHeader: '' as Ref<Mixin<ObjectEditorHeader>>,
    ObjectValidator: '' as Ref<Mixin<ObjectValidator>>,
    ObjectFactory: '' as Ref<Mixin<ObjectFactory>>,
    SpaceHeader: '' as Ref<Mixin<SpaceHeader>>,
    IgnoreActions: '' as Ref<Mixin<IgnoreActions>>,
    HTMLPresenter: '' as Ref<Mixin<HTMLPresenter>>,
    TextPresenter: '' as Ref<Mixin<TextPresenter>>,
    PreviewPresenter: '' as Ref<Mixin<PreviewPresenter>>
  },
  class: {
    ViewletDescriptor: '' as Ref<Class<ViewletDescriptor>>,
    Viewlet: '' as Ref<Class<Viewlet>>,
    Action: '' as Ref<Class<Action>>,
    ActionTarget: '' as Ref<Class<ActionTarget>>
  },
  viewlet: {
    Table: '' as Ref<ViewletDescriptor>
  },
  component: {
    ObjectPresenter: '' as AnyComponent,
    EditDoc: '' as AnyComponent,
    SpacePresenter: '' as AnyComponent
  },
  icon: {
    Table: '' as Asset,
    Delete: '' as Asset,
    MoreH: '' as Asset,
    Move: '' as Asset,
    Archive: '' as Asset,
    Statuses: '' as Asset
  }
})
export default view
