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
  CategoryType,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  Lookup,
  Mixin,
  Obj,
  ObjQueryType,
  PrimitiveType,
  Ref,
  SortingOrder,
  Space,
  StatusManager,
  StatusValue,
  Type,
  UXObject
} from '@hcengineering/core'
import { Asset, IntlString, Plugin, plugin, Resource, Status } from '@hcengineering/platform'
import type { Preference } from '@hcengineering/preference'
import type {
  AnyComponent,
  AnySvelteComponent,
  Location,
  Location as PlatformLocation,
  PopupAlignment,
  PopupPosAlignment
} from '@hcengineering/ui'

/**
 * @public
 */
export interface KeyFilter {
  _class: Ref<Class<Doc>>
  key: string
  attribute: AnyAttribute
  component: AnyComponent
  label: IntlString
  icon: Asset | AnySvelteComponent | undefined
}

/**
 * @public
 */
export interface FilterMode extends Doc {
  label: IntlString
  disableValueSelector?: boolean
  result: FilterFunction
}

/**
 * @public
 */
export type FilterFunction = Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>

/**
 * @public
 */
export interface Filter {
  key: KeyFilter
  nested?: Filter
  mode: Ref<FilterMode>
  modes: Ref<FilterMode>[]
  value: any[]
  props?: Record<string, any>
  index: number
  onRemove?: () => void
}

/**
 * @public
 */
export interface FilteredView extends Preference {
  name: string
  location: PlatformLocation
  filters: string
  viewOptions?: ViewOptions
  filterClass?: Ref<Class<Doc>>
  viewletId?: Ref<Viewlet> | null
}

/**
 * @public
 */
export interface ClassFilters extends Class<Doc> {
  filters: (KeyFilter | string)[]
  ignoreKeys?: string[]
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
  inlineEditor: AnyComponent
  // If defined could be used for ShowEditor declarative actions.
  popup?: AnyComponent
}

/**
 * @public
 */
export interface CollectionEditor extends Class<Doc> {
  editor: AnyComponent
  inlineEditor?: AnyComponent
}

/**
 * @public
 */
export interface InlineAttributEditor extends Class<Doc> {
  editor: AnyComponent
}

/**
 * @public
 */
export interface ArrayEditor extends Class<Doc> {
  editor?: AnyComponent
  inlineEditor?: AnyComponent
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
export interface ActivityAttributePresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export interface SpacePresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export interface ObjectPresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export interface ListItemPresenter extends Class<Doc> {
  presenter: AnyComponent
}

/**
 * @public
 */
export interface ObjectEditor extends Class<Doc> {
  editor: AnyComponent
  pinned?: boolean
}

/**
 * @public
 */
export interface ObjectEditorFooter extends Class<Doc> {
  editor: AnyComponent
  props?: Record<string, any>
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
export interface ObjectTitle extends Class<Doc> {
  titleProvider: Resource<<T extends Doc>(client: Client, ref: Ref<T>) => Promise<string>>
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
export interface ListHeaderExtra extends Class<Doc> {
  presenters: AnyComponent[]
}

/**
 * @public
 */
export type SortFunc = Resource<
(values: (PrimitiveType | StatusValue)[], viewletDescriptorId?: Ref<ViewletDescriptor>) => Promise<any[]>
>

/**
 * @public
 */
export interface ClassSortFuncs extends Class<Doc> {
  func: SortFunc
}

/**
 * @public
 */
export type GetAllValuesFunc = Resource<
(query: DocumentQuery<Doc> | undefined, onUpdate: () => void, queryId: Ref<Doc>) => Promise<any[] | undefined>
>

/**
 * @public
 */
export interface AllValuesFunc extends Class<Doc> {
  func: GetAllValuesFunc
}

/**
 * @public
 */
export interface Viewlet extends Doc {
  attachTo: Ref<Class<Doc>>
  baseQuery?: DocumentQuery<Doc>
  descriptor: Ref<ViewletDescriptor>
  options?: FindOptions<Doc>
  config: (BuildModelKey | string)[]
  hiddenKeys?: string[]
  viewOptions?: ViewOptionsModel
  variant?: string
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
export type ActionGroup = 'create' | 'edit' | 'associate' | 'copy' | 'tools' | 'other'

/**
 * @public
 */
export interface Action<T extends Doc = Doc, P = Record<string, any>> extends Doc, UXObject {
  // Action implementation details
  action: ViewAction<P>
  // Action implementation parameters
  actionProps?: P

  // If specified, will show sub menu based on actionPopup/actionProps
  actionPopup?: AnyComponent

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

  // Action is shown only if the check is passed
  visibilityTester?: Resource<(doc?: Doc | Doc[]) => Promise<boolean>>

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

  // Avaible only for workspace owners
  secured?: boolean
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
  group?: ActionGroup
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
  presenter?: AnyComponent | AnySvelteComponent
  // A set of extra props passed to presenter.
  props?: Record<string, any>

  label?: IntlString
  sortingKey?: string | string[]

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
  sortingKey: string | string[]
  // Extra icon if applicable
  icon?: Asset

  attribute?: AnyAttribute
  collectionAttr: boolean
  isLookup: boolean

  castRequest?: Ref<Mixin<Doc>>
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
  component?: AnyComponent
  create?: Resource<(props?: Record<string, any>) => Promise<void>>
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
export type ViewOptions = {
  groupBy: string[]
  orderBy: OrderOption
} & Record<string, any>

/**
 * @public
 */
export interface ViewOption {
  type: string
  key: string
  defaultValue: any
  label: IntlString
  hidden?: (viewOptions: ViewOptions) => boolean
  actionTarget?: 'query' | 'category'
  action?: Resource<(value: any, ...params: any) => any>
}
/**
 * @public
 */
export type ViewCategoryActionFunc = (
  _class: Ref<Class<Doc>>,
  query: DocumentQuery<Doc> | undefined,
  key: string,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  mgr: StatusManager,
  viewletDescriptorId?: Ref<ViewletDescriptor>
) => Promise<CategoryType[] | undefined>
/**
 * @public
 */
export type ViewCategoryAction = Resource<ViewCategoryActionFunc>

/**
 * @public
 */
export interface CategoryOption extends ViewOption {
  actionTarget: 'category'
  action: ViewCategoryAction
}

/**
 * @public
 */
export type ViewQueryAction = Resource<(value: any, query: DocumentQuery<Doc>) => DocumentQuery<Doc>>

/**
 * @public
 */
export interface ViewQueryOption extends ViewOption {
  actionTarget: 'query'
  action: ViewQueryAction
}

/**
 * @public
 */
export interface ToggleViewOption extends ViewOption {
  type: 'toggle'
  defaultValue: boolean
}

/**
 * @public
 */
export interface DropdownViewOption extends ViewOption {
  type: 'dropdown'
  defaultValue: string
  values: Array<{ label: IntlString, id: string, hidden?: (viewOptions: ViewOptions) => boolean }>
}

/**
 * @public
 */
export type ViewOptionModel = ToggleViewOption | DropdownViewOption

/**
 * @public
 */
export type OrderOption = [string, SortingOrder]

/**
 * @public
 */
export interface LinkProvider extends Class<Doc> {
  encode: Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>
}

/**
 * @public
 */
export interface ObjectPanel extends Class<Doc> {
  component: AnyComponent
}

/**
 * @public
 */
export interface ViewOptionsModel {
  groupBy: string[]
  orderBy: OrderOption[]
  other: ViewOptionModel[]
  groupDepth?: number
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
    InlineAttributEditor: '' as Ref<Mixin<InlineAttributEditor>>,
    ArrayEditor: '' as Ref<Mixin<ArrayEditor>>,
    AttributePresenter: '' as Ref<Mixin<AttributePresenter>>,
    ActivityAttributePresenter: '' as Ref<Mixin<ActivityAttributePresenter>>,
    ListItemPresenter: '' as Ref<Mixin<ListItemPresenter>>,
    ObjectEditor: '' as Ref<Mixin<ObjectEditor>>,
    ObjectPresenter: '' as Ref<Mixin<ObjectPresenter>>,
    ObjectEditorHeader: '' as Ref<Mixin<ObjectEditorHeader>>,
    ObjectEditorFooter: '' as Ref<Mixin<ObjectEditorFooter>>,
    ObjectValidator: '' as Ref<Mixin<ObjectValidator>>,
    ObjectFactory: '' as Ref<Mixin<ObjectFactory>>,
    ObjectTitle: '' as Ref<Mixin<ObjectTitle>>,
    SpaceHeader: '' as Ref<Mixin<SpaceHeader>>,
    SpaceName: '' as Ref<Mixin<SpaceName>>,
    IgnoreActions: '' as Ref<Mixin<IgnoreActions>>,
    PreviewPresenter: '' as Ref<Mixin<PreviewPresenter>>,
    ListHeaderExtra: '' as Ref<Mixin<ListHeaderExtra>>,
    SortFuncs: '' as Ref<Mixin<ClassSortFuncs>>,
    AllValuesFunc: '' as Ref<Mixin<AllValuesFunc>>,
    ObjectPanel: '' as Ref<Mixin<ObjectPanel>>,
    LinkProvider: '' as Ref<Mixin<LinkProvider>>,
    SpacePresenter: '' as Ref<Mixin<SpacePresenter>>
  },
  class: {
    ViewletPreference: '' as Ref<Class<ViewletPreference>>,
    ViewletDescriptor: '' as Ref<Class<ViewletDescriptor>>,
    Viewlet: '' as Ref<Class<Viewlet>>,
    Action: '' as Ref<Class<Action>>,
    ActionCategory: '' as Ref<Class<ActionCategory>>,
    LinkPresenter: '' as Ref<Class<LinkPresenter>>,
    FilterMode: '' as Ref<Class<FilterMode>>,
    FilteredView: '' as Ref<Class<FilteredView>>
  },
  action: {
    Delete: '' as Ref<Action>,
    Move: '' as Ref<Action>,
    MoveLeft: '' as Ref<Action>,
    MoveRight: '' as Ref<Action>,
    MoveUp: '' as Ref<Action>,
    MoveDown: '' as Ref<Action>,

    SelectItem: '' as Ref<Action>,
    SelectItemAll: '' as Ref<Action>,
    SelectItemNone: '' as Ref<Action>,
    SelectUp: '' as Ref<Action>,
    SelectDown: '' as Ref<Action>,

    ShowPreview: '' as Ref<Action>,
    ShowActions: '' as Ref<Action>,
    Preview: '' as Ref<Action>,

    // Edit document
    Open: '' as Ref<Action>
  },
  viewlet: {
    Table: '' as Ref<ViewletDescriptor>,
    List: '' as Ref<ViewletDescriptor>
  },
  component: {
    ObjectPresenter: '' as AnyComponent,
    EditDoc: '' as AnyComponent,
    SpacePresenter: '' as AnyComponent,
    BooleanTruePresenter: '' as AnyComponent,
    ValueSelector: '' as AnyComponent,
    GrowPresenter: '' as AnyComponent,
    DividerPresenter: '' as AnyComponent
  },
  string: {
    CustomizeView: '' as IntlString,
    LabelNA: '' as IntlString,
    View: '' as IntlString,
    FilteredViews: '' as IntlString,
    NewFilteredView: '' as IntlString,
    FilteredViewName: '' as IntlString,
    Move: '' as IntlString,
    MoveClass: '' as IntlString,
    SelectToMove: '' as IntlString,
    Cancel: '' as IntlString,
    List: '' as IntlString,
    Timeline: '' as IntlString
  },
  icon: {
    Table: '' as Asset,
    List: '' as Asset,
    Card: '' as Asset,
    Timeline: '' as Asset,
    Delete: '' as Asset,
    MoreH: '' as Asset,
    Move: '' as Asset,
    Archive: '' as Asset,
    Statuses: '' as Asset,
    Setting: '' as Asset,
    Open: '' as Asset,
    ArrowRight: '' as Asset,
    Views: '' as Asset,
    Pin: '' as Asset,
    Model: '' as Asset,
    ViewButton: '' as Asset,
    Filter: '' as Asset
  },
  category: {
    General: '' as Ref<ActionCategory>,
    GeneralNavigation: '' as Ref<ActionCategory>,
    Navigation: '' as Ref<ActionCategory>,
    Editor: '' as Ref<ActionCategory>,
    MarkdownFormatting: '' as Ref<ActionCategory>
  },
  filter: {
    FilterObjectIn: '' as Ref<FilterMode>,
    FilterObjectNin: '' as Ref<FilterMode>,
    FilterValueIn: '' as Ref<FilterMode>,
    FilterValueNin: '' as Ref<FilterMode>,
    FilterBefore: '' as Ref<FilterMode>,
    FilterAfter: '' as Ref<FilterMode>,
    FilterNestedMatch: '' as Ref<FilterMode>,
    FilterNestedDontMatch: '' as Ref<FilterMode>
  },
  popup: {
    PositionElementAlignment: '' as Resource<(e?: Event) => PopupAlignment | undefined>
  },
  actionImpl: {
    CopyTextToClipboard: '' as ViewAction<{
      textProvider: Resource<(doc: Doc, props: Record<string, any>) => Promise<string>>
      props?: Record<string, any>
    }>,
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
      // Will copy values from selection document to props
      fillProps?: Record<string, string>
    }>,
    ShowEditor: '' as ViewAction<{
      element?: PopupPosAlignment | Resource<(e?: Event) => PopupAlignment | undefined>
      attribute: string
      props?: Record<string, any>
    }>,
    ValueSelector: '' as ViewAction<{
      attribute: string

      // Class object finder
      _class?: Ref<Class<Doc>>
      query?: DocumentQuery<Doc>
      queryOptions?: FindOptions<Doc>
      // Will copy values from selection document to query
      // If set of docs passed, will do $in for values.
      fillQuery?: Record<string, string>

      // A list of fields with matched values to perform action.
      docMatches?: string[]
      searchField?: string

      // Cast doc to mixin
      castRequest?: Ref<Mixin<Doc>>

      // Or list of values to select from
      values?: { icon?: Asset, label: IntlString, id: number | string }[]

      placeholder?: IntlString
    }>,
    AttributeSelector: '' as ViewAction<{
      attribute: string
      isAction?: boolean

      // Or list of values to select from
      values?: { icon?: Asset, label: IntlString, id: number | string }[]
    }>
  }
})
export default view
