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
  Lookup,
  Mixin,
  Obj,
  ObjQueryType,
  Ref,
  Space,
  Type,
  UXObject
} from '@anticrm/core'
import type { Asset, IntlString, Plugin, Resource, Status } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { AnyComponent, AnySvelteComponent } from '@anticrm/ui'
import { PopupAlignment, PopupPosAlignment } from '@anticrm/ui/src/types'
import type { Preference } from '@anticrm/preference'

/**
 * @public
 */
export interface KeyFilter {
  key: string
  component: AnyComponent
  label: IntlString
  icon: Asset | undefined
}

/**
 * @public
 */
export interface FilterMode {
  label: IntlString
  isAvailable: (values: any[]) => boolean
  result: (values: any[], onUpdate: () => void) => Promise<ObjQueryType<any>>
}

/**
 * @public
 */
export interface Filter {
  key: KeyFilter
  mode: FilterMode
  modes: FilterMode[]
  value: any[]
  index: number
  onRemove?: () => void
}

/**
 * @public
 */
export interface ClassFilters extends Class<Doc> {
  filters: (KeyFilter | string)[]
}

/**
 * @public
 */
export interface AttributeFilter extends Class<Type<any>> {
  component: AnyComponent
}

/**
 * @public
 */
export interface AttributeEditor extends Class<Doc> {
  editor: AnyComponent
  // If defined could be used for ShowEditor declarative actions.
  popup?: AnyComponent
}

/**
 * @public
 */
export interface CollectionEditor extends Class<Doc> {
  editor: AnyComponent
}

/**
 * @public
 */
export interface CollectionPresenter extends Class<Doc> {
  presenter: AnyComponent
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
export interface SpaceName extends Class<Doc> {
  getName: Resource<(client: Client, space: Space) => Promise<string>>
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
  config: (BuildModelKey | string)[]
  hiddenKeys?: string[]
}

/**
 * @public
 */
export interface LinkPresenter extends Doc {
  pattern: string
  component: AnyComponent
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
export type ViewActionInput = 'focus' | 'selection' | 'any' | 'none'

/**
 * @public
 */
export type ViewAction<T = Record<string, any>> = Resource<
(doc: Doc | Doc[] | undefined, evt: Event, params?: T) => Promise<void>
>

/**
 * @public
 */
export interface ActionCategory extends Doc, UXObject {
  // Does category is visible for use in popup.
  visible: boolean
}

/**
 * @public
 */
export interface Action<T extends Doc = Doc, P = Record<string, any>> extends Doc, UXObject {
  // Action implementation details
  action: ViewAction<P>
  // Action implementation parameters
  actionProps?: P

  // If specified, action could be used only with one item selected.
  // single - one object is required
  // any - one or multiple objects are required
  // any - any input is suitable.
  input: ViewActionInput
  inline?: boolean

  // Focus and/or all selection document should match target class.
  target: Ref<Class<Doc>>
  // Action is applicable only for objects matching criteria
  query?: DocumentQuery<T>

  // If defined, types should be matched to proposed list
  inputProps?: Record<string, Ref<Class<Doc>>>

  // Kayboard bindings
  keyBinding?: KeyBinding[]

  // short description for action.
  description?: IntlString

  // Action category, for UI.
  category: Ref<ActionCategory>

  // Context action is defined for
  context: ViewContext

  // A list of actions replaced by this one.
  // For example it could be global action and action for focus class, second one fill override first one.
  override?: Ref<Action>[]
}

/**
 * @public
 *  context - only for context menu actions.
 *  workbench - global actions per application or entire workbench.
 *  browser - actions for list/table/kanban browsing.
 *  editor - actions for selected editor context.
 *  panel - for panel based actions.
 *  popup - for popup based actions, like Close of Popup.
 *  input - for input based actions, some actions should be available for input controls.
 */
export type ViewContextType = 'context' | 'workbench' | 'browser' | 'editor' | 'panel' | 'popup' | 'input' | 'none'

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
  lookup?: Lookup<Doc>
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
export interface ViewletPreference extends Preference {
  attachedTo: Ref<Viewlet>
  config: (BuildModelKey | string)[]
}

/**
 * @public
 */
const view = plugin(viewId, {
  mixin: {
    ClassFilters: '' as Ref<Mixin<ClassFilters>>,
    AttributeFilter: '' as Ref<Mixin<AttributeFilter>>,
    AttributeEditor: '' as Ref<Mixin<AttributeEditor>>,
    CollectionPresenter: '' as Ref<Mixin<CollectionPresenter>>,
    CollectionEditor: '' as Ref<Mixin<CollectionEditor>>,
    AttributePresenter: '' as Ref<Mixin<AttributePresenter>>,
    ObjectEditor: '' as Ref<Mixin<ObjectEditor>>,
    ObjectEditorHeader: '' as Ref<Mixin<ObjectEditorHeader>>,
    ObjectValidator: '' as Ref<Mixin<ObjectValidator>>,
    ObjectFactory: '' as Ref<Mixin<ObjectFactory>>,
    SpaceHeader: '' as Ref<Mixin<SpaceHeader>>,
    SpaceName: '' as Ref<Mixin<SpaceName>>,
    IgnoreActions: '' as Ref<Mixin<IgnoreActions>>,
    HTMLPresenter: '' as Ref<Mixin<HTMLPresenter>>,
    TextPresenter: '' as Ref<Mixin<TextPresenter>>,
    PreviewPresenter: '' as Ref<Mixin<PreviewPresenter>>
  },
  class: {
    ViewletPreference: '' as Ref<Class<ViewletPreference>>,
    ViewletDescriptor: '' as Ref<Class<ViewletDescriptor>>,
    Viewlet: '' as Ref<Class<Viewlet>>,
    Action: '' as Ref<Class<Action>>,
    ActionCategory: '' as Ref<Class<ActionCategory>>,
    LinkPresenter: '' as Ref<Class<LinkPresenter>>
  },
  viewlet: {
    Table: '' as Ref<ViewletDescriptor>
  },
  component: {
    ObjectPresenter: '' as AnyComponent,
    EditDoc: '' as AnyComponent,
    SpacePresenter: '' as AnyComponent,
    BooleanTruePresenter: '' as AnyComponent
  },
  string: {
    CustomizeView: '' as IntlString
  },
  icon: {
    Table: '' as Asset,
    Card: '' as Asset,
    Delete: '' as Asset,
    MoreH: '' as Asset,
    Move: '' as Asset,
    Archive: '' as Asset,
    Statuses: '' as Asset,
    Setting: '' as Asset,
    Open: '' as Asset,
    ArrowRight: '' as Asset,
    Views: '' as Asset,
    Pin: '' as Asset
  },
  category: {
    General: '' as Ref<ActionCategory>,
    GeneralNavigation: '' as Ref<ActionCategory>,
    Navigation: '' as Ref<ActionCategory>,
    Editor: '' as Ref<ActionCategory>,
    MarkdownFormatting: '' as Ref<ActionCategory>
  },
  popup: {
    PositionElementAlignment: '' as Resource<(e?: Event) => PopupAlignment | undefined>
  },
  actionImpl: {
    UpdateDocument: '' as ViewAction<{
      key: string
      value: any
      ask?: boolean
      label?: IntlString
      message?: IntlString
    }>,
    ShowPanel: '' as ViewAction<{
      component?: AnyComponent
      element?: PopupPosAlignment
      rightSection?: AnyComponent
    }>,
    ShowPopup: '' as ViewAction<{
      component: AnyComponent
      element?: PopupPosAlignment | Resource<(e?: Event) => PopupAlignment | undefined>
      _id?: string
      _class?: string
      _space?: string
      value?: string
      values?: string
      props?: Record<string, any>
    }>,
    ShowEditor: '' as ViewAction<{
      element?: PopupPosAlignment | Resource<(e?: Event) => PopupAlignment | undefined>
      attribute: string
      props?: Record<string, any>
    }>
  }
})
export default view
