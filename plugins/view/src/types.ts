//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2024 Hardcore Engineering Inc.
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
  Account,
  AggregateValue,
  AnyAttribute,
  CategoryType,
  Class,
  Client,
  Doc,
  DocManager,
  DocumentQuery,
  FindOptions,
  Hierarchy,
  Lookup,
  Mixin,
  Obj,
  ObjQueryType,
  PrimitiveType,
  Ref,
  SortingOrder,
  Space,
  Tx,
  TxOperations,
  Type,
  UXObject
} from '@hcengineering/core'
import { Asset, IntlString, Resource, Status } from '@hcengineering/platform'
import { Preference } from '@hcengineering/preference'
import {
  AnyComponent,
  AnySvelteComponent,
  Location,
  Location as PlatformLocation,
  type LabelAndProps
} from '@hcengineering/ui'

/**
 * @public
 */
export interface KeyFilterPreset {
  _class: Ref<Class<Doc>>
  key: string
  attribute?: AnyAttribute
  component: AnyComponent
  label?: IntlString
  group?: 'top' | 'bottom'
  showNested?: boolean
}

/**
 * @public
 */
export interface KeyFilter extends KeyFilterPreset {
  attribute: AnyAttribute
  component: AnyComponent
  label: IntlString
  group?: 'top' | 'bottom'
}

/**
 * @public
 */
export interface FilterMode extends Doc {
  label: IntlString
  selectedLabel?: IntlString
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
export interface FilteredView extends Doc {
  name: string
  location: PlatformLocation
  filters: string
  viewOptions?: ViewOptions
  filterClass?: Ref<Class<Doc>>
  viewletId?: Ref<Viewlet> | null
  sharable?: boolean
  users: Ref<Account>[]
  createdBy: Ref<Account>
  attachedTo: string
}

/**
 * @public
 */
export interface ClassFilters extends Class<Doc> {
  filters: (KeyFilterPreset | string)[]
  ignoreKeys?: string[]

  // Ignore attributes not specified in the "filters" array
  strict?: boolean
  // Allows to filter out the provided keys, leaving only the necessary ones
  getVisibleFilters?: Resource<(filters: KeyFilter[], space?: Ref<Space>) => Promise<KeyFilter[]>>
}

/**
 * @public
 */
export interface AttributeFilter extends Class<Type<any>> {
  component: AnyComponent
  group?: 'top' | 'bottom'
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
  arrayPresenter?: AnyComponent
}

/**
 * @public
 */
export interface AttributeFilterPresenter extends Class<Doc> {
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
  titleProvider: Resource<<T extends Doc>(client: Client, ref: Ref<T>, doc?: T) => Promise<string>>
}

/**
 * @public
 */
export interface ObjectIcon extends Class<Doc> {
  component: AnyComponent
}

/**
 * @public
 */
export interface ObjectIdentifier extends Class<Doc> {
  provider: Resource<<T extends Doc>(client: Client, ref: Ref<T>, doc?: T) => Promise<string>>
}

/**
 * @public
 */
export interface ObjectTooltip extends Class<Doc> {
  provider: Resource<(client: Client, doc?: Doc | null) => Promise<LabelAndProps | undefined>>
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
(
  client: TxOperations,
  values: PrimitiveType[],
  space: Ref<Space> | undefined,
  viewletDescriptorId?: Ref<ViewletDescriptor>
) => Promise<any[]>
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
(
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  attr: AnyAttribute
) => Promise<any[] | undefined>
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
export interface GrouppingManager {
  groupByCategories: (categories: any[]) => AggregateValue[]
  groupValues: (val: Doc[], targets: Set<any>) => Doc[]
  groupValuesWithEmpty: (
    hierarchy: Hierarchy,
    _class: Ref<Class<Doc>>,
    key: string,
    query: DocumentQuery<Doc> | undefined
  ) => Array<Ref<Doc>>
  hasValue: (value: Doc | undefined | null, values: any[]) => boolean
}

/**
 * @public
 */
export type GrouppingManagerResource = Resource<GrouppingManager>

/**
 * @public
 */
export interface Groupping extends Class<Doc> {
  grouppingManager: GrouppingManagerResource
}

/**
 * @public
 */
export interface IAggregationManager<T extends Doc> {
  close: () => void
  notifyTx: (...tx: Tx[]) => Promise<void>
  categorize: (target: Array<Ref<T>>, attr: AnyAttribute) => Promise<Array<Ref<T>>>
  getAttrClass: () => Ref<Class<T>>
  updateSorting?: (finalOptions: FindOptions<T>, attr: AnyAttribute) => Promise<void>
}

/**
 * @public
 */
export type AggregationManagerResource = Resource<IAggregationManager<any>>

/**
 * @public
 */
export type CreateAggregationManagerFunc = Resource<
(
  client: Client,
  lqCallback: () => void,
  setStore: (manager: DocManager<any>) => void,
  categorizingFunc: (doc: any, target: any) => boolean,
  _class: Ref<Class<any>>
) => IAggregationManager<any>
>

/**
 * @public
 */
export interface Aggregation extends Class<Doc> {
  createAggregationManager: CreateAggregationManagerFunc
  setStoreFunc: Resource<(manager: DocManager<any>) => void>
  filterFunc: Resource<(doc: Doc, target: Doc) => boolean>
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
  configOptions?: ViewletConfigOptions
  viewOptions?: ViewOptionsModel
  variant?: string
  props?: Record<string, any>
}

/**
 * @public
 */
export interface ViewletConfigOptions {
  hiddenKeys?: string[]
  strict?: boolean
  extraProps?: Omit<BuildModelKey, 'key'>
  sortable?: boolean
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

export type ViewActionFunction<T extends Doc = Doc, P = Record<string, any>> = (
  doc: T | T[] | undefined,
  evt?: Event,
  params?: P
) => Promise<void>

/**
 * @public
 */
export type ViewActionAvailabilityFunction<T extends Doc = Doc> = (doc: T | T[] | undefined) => Promise<boolean>

/**
 * @public
 */
export type ViewAction<P = Record<string, any>> = Resource<ViewActionFunction<Doc, P>>

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
export type ActionGroup = 'create' | 'edit' | 'associate' | 'copy' | 'tools' | 'other' | 'remove'

/**
 * @public
 */
export interface Action<T extends Doc = Doc, P = Record<string, any>> extends Doc, UXObject {
  // Action implementation details
  action: Resource<ViewActionFunction<T, P>>
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
  visibilityTester?: Resource<ViewActionAvailabilityFunction<T>>

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
  // For example, it could be global action and action for focus class, second one fill override first one.
  override?: Ref<Action>[]

  // Available only for workspace owners
  secured?: boolean
  allowedForEditableContent?: boolean
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
export interface ActionIgnore {
  _class: Ref<Class<Doc>>
  // Action to be ignored
  action: Ref<Action>
  // Document match to ignore if matching at least one document.
  query: DocumentQuery<Doc>
}

/**
 * @public
 */
export interface IgnoreActions extends Class<Doc> {
  actions: (Ref<Action> | ActionIgnore)[]
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
export interface DisplayProps {
  key?: string
  excludeByKey?: string
  fixed?: 'left' | 'right' // using for align items in row
  align?: 'left' | 'right' | 'center'
  suffix?: boolean
  optional?: boolean
  compression?: boolean
  grow?: boolean
  dividerBefore?: boolean // should show divider before
}

/**
 * @public
 */
export interface BuildModelKey {
  key: string
  presenter?: AnyComponent | AnySvelteComponent
  // A set of extra props passed to presenter.
  props?: Record<string, any>
  // A set of extra props which using for display.
  displayProps?: DisplayProps

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
  displayProps?: DisplayProps
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
  actionTarget?: 'query' | 'category' | 'display'
  action?: Resource<(value: any, ...params: any) => any>
}
/**
 * @public
 */
export type ViewCategoryActionFunc = (
  _class: Ref<Class<Doc>>,
  query: DocumentQuery<Doc> | undefined,
  space: Ref<Space> | undefined,
  key: string,
  onUpdate: () => void,
  queryId: Ref<Doc>,
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
export type ViewQueryAction = Resource<
(value: any, query: DocumentQuery<Doc>) => DocumentQuery<Doc> | Promise<DocumentQuery<Doc>>
>

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
export interface IconProps {
  icon?: Asset
  color?: number
}

export type AttributeCategory = 'attribute' | 'inplace' | 'collection' | 'array' | 'object'

export const AttributeCategoryOrder: Record<AttributeCategory, number> = {
  attribute: 0,
  inplace: 1,
  collection: 2,
  array: 3,
  object: 4
}

export type ObjectPresenterType = 'link' | 'text'

export interface AttrPresenter extends Doc {
  attribute: Ref<AnyAttribute>
  category: AttributeCategory
  objectClass: Ref<Class<Doc>>
  component: AnyComponent
}
