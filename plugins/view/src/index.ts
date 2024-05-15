//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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

import { Class, Doc, DocumentQuery, FindOptions, Mixin, Ref } from '@hcengineering/core'
import { Asset, IntlString, Plugin, Resource, plugin } from '@hcengineering/platform'
import { AnyComponent, PopupAlignment, PopupPosAlignment } from '@hcengineering/ui'
import {
  Action,
  ActionCategory,
  ActivityAttributePresenter,
  Aggregation,
  AllValuesFunc,
  ArrayEditor,
  AttributeEditor,
  AttributeFilter,
  AttributeFilterPresenter,
  AttributePresenter,
  ClassFilters,
  ClassSortFuncs,
  CollectionEditor,
  CollectionPresenter,
  FilterMode,
  FilteredView,
  Groupping,
  IgnoreActions,
  InlineAttributEditor,
  LinkPresenter,
  LinkProvider,
  ListHeaderExtra,
  ListItemPresenter,
  ObjectEditor,
  ObjectEditorFooter,
  ObjectEditorHeader,
  ObjectFactory,
  ObjectIcon,
  ObjectIdentifier,
  ObjectPanel,
  ObjectPresenter,
  ObjectTitle,
  ObjectTooltip,
  ObjectValidator,
  AttrPresenter,
  PreviewPresenter,
  SpaceHeader,
  SpaceName,
  SpacePresenter,
  ViewAction,
  Viewlet,
  ViewletDescriptor,
  ViewletPreference
} from './types'

export * from './types'

/**
 * @public
 */
export const viewId = 'view' as Plugin

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
    ObjectIdentifier: '' as Ref<Mixin<ObjectIdentifier>>,
    ObjectTooltip: '' as Ref<Mixin<ObjectTooltip>>,
    SpaceHeader: '' as Ref<Mixin<SpaceHeader>>,
    SpaceName: '' as Ref<Mixin<SpaceName>>,
    IgnoreActions: '' as Ref<Mixin<IgnoreActions>>,
    PreviewPresenter: '' as Ref<Mixin<PreviewPresenter>>,
    ListHeaderExtra: '' as Ref<Mixin<ListHeaderExtra>>,
    SortFuncs: '' as Ref<Mixin<ClassSortFuncs>>,
    AllValuesFunc: '' as Ref<Mixin<AllValuesFunc>>,
    ObjectPanel: '' as Ref<Mixin<ObjectPanel>>,
    LinkProvider: '' as Ref<Mixin<LinkProvider>>,
    SpacePresenter: '' as Ref<Mixin<SpacePresenter>>,
    AttributeFilterPresenter: '' as Ref<Mixin<AttributeFilterPresenter>>,
    Aggregation: '' as Ref<Mixin<Aggregation>>,
    Groupping: '' as Ref<Mixin<Groupping>>,
    ObjectIcon: '' as Ref<Mixin<ObjectIcon>>
  },
  class: {
    ViewletPreference: '' as Ref<Class<ViewletPreference>>,
    ViewletDescriptor: '' as Ref<Class<ViewletDescriptor>>,
    Viewlet: '' as Ref<Class<Viewlet>>,
    Action: '' as Ref<Class<Action>>,
    ActionCategory: '' as Ref<Class<ActionCategory>>,
    LinkPresenter: '' as Ref<Class<LinkPresenter>>,
    FilterMode: '' as Ref<Class<FilterMode>>,
    FilteredView: '' as Ref<Class<FilteredView>>,
    AttrPresenter: '' as Ref<Class<AttrPresenter>>
  },
  action: {
    Delete: '' as Ref<Action>,
    Archive: '' as Ref<Action>,
    Join: '' as Ref<Action>,
    Leave: '' as Ref<Action>,
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
    Open: '' as Ref<Action>,
    OpenInNewTab: '' as Ref<Action>
  },
  viewlet: {
    Table: '' as Ref<ViewletDescriptor>,
    List: '' as Ref<ViewletDescriptor>
  },
  component: {
    ActionsPopup: '' as AnyComponent,
    ObjectPresenter: '' as AnyComponent,
    EditDoc: '' as AnyComponent,
    SpacePresenter: '' as AnyComponent,
    BooleanTruePresenter: '' as AnyComponent,
    ValueSelector: '' as AnyComponent,
    GrowPresenter: '' as AnyComponent,
    DividerPresenter: '' as AnyComponent,
    IconWithEmoji: '' as AnyComponent,
    AttachedDocPanel: '' as AnyComponent,
    ObjectMention: '' as AnyComponent,
    SearchSelector: '' as AnyComponent
  },
  ids: {
    IconWithEmoji: '' as Asset
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
    Grid: '' as IntlString,
    AddSavedView: '' as IntlString,
    Timeline: '' as IntlString,
    Public: '' as IntlString,
    Hide: '' as IntlString,
    Rename: '' as IntlString,
    Assigned: '' as IntlString,
    Open: '' as IntlString,
    OpenInNewTab: '' as IntlString,
    Created: '' as IntlString,
    Delete: '' as IntlString,
    Then: '' as IntlString,
    Or: '' as IntlString,
    Subscribed: '' as IntlString,
    HyperlinkPlaceholder: '' as IntlString,
    CopyToClipboard: '' as IntlString,
    NoGrouping: '' as IntlString,
    Type: '' as IntlString,
    UnArchive: '' as IntlString,
    Archive: '' as IntlString,
    Save: '' as IntlString,
    PublicView: '' as IntlString,
    Archived: '' as IntlString,
    MoreActions: '' as IntlString,
    Pin: '' as IntlString,
    Unpin: '' as IntlString,
    Join: '' as IntlString,
    Leave: '' as IntlString,
    Copied: '' as IntlString
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
    Edit: '' as Asset,
    CopyId: '' as Asset,
    CopyLink: '' as Asset,
    ArrowRight: '' as Asset,
    Views: '' as Asset,
    Pin: '' as Asset,
    Model: '' as Asset,
    DevModel: '' as Asset,
    ViewButton: '' as Asset,
    Filter: '' as Asset,
    Configure: '' as Asset,
    Database: '' as Asset,
    Star: '' as Asset,
    Eye: '' as Asset,
    EyeCrossed: '' as Asset,
    Bubble: '' as Asset,
    CheckCircle: '' as Asset,
    Add: '' as Asset,
    Image: '' as Asset,
    Table2: '' as Asset,
    CodeBlock: '' as Asset,
    SeparatorLine: '' as Asset,
    Circle: '' as Asset,
    Join: '' as Asset,
    Leave: '' as Asset,
    Copy: '' as Asset
  },
  category: {
    General: '' as Ref<ActionCategory>,
    GeneralNavigation: '' as Ref<ActionCategory>,
    Navigation: '' as Ref<ActionCategory>,
    Editor: '' as Ref<ActionCategory>,
    MarkdownFormatting: '' as Ref<ActionCategory>
  },
  filter: {
    FilterArrayAll: '' as Ref<FilterMode>,
    FilterArrayAny: '' as Ref<FilterMode>,
    FilterObjectIn: '' as Ref<FilterMode>,
    FilterObjectNin: '' as Ref<FilterMode>,
    FilterValueIn: '' as Ref<FilterMode>,
    FilterValueNin: '' as Ref<FilterMode>,
    FilterBefore: '' as Ref<FilterMode>,
    FilterAfter: '' as Ref<FilterMode>,
    FilterContains: '' as Ref<FilterMode>,
    FilterNestedMatch: '' as Ref<FilterMode>,
    FilterNestedDontMatch: '' as Ref<FilterMode>,
    FilterDateOutdated: '' as Ref<FilterMode>,
    FilterDateToday: '' as Ref<FilterMode>,
    FilterDateYesterday: '' as Ref<FilterMode>,
    FilterDateWeek: '' as Ref<FilterMode>,
    FilterDateNextW: '' as Ref<FilterMode>,
    FilterDateM: '' as Ref<FilterMode>,
    FilterDateNextM: '' as Ref<FilterMode>,
    FilterDateNotSpecified: '' as Ref<FilterMode>,
    FilterDateCustom: '' as Ref<FilterMode>,
    FilterDateBetween: '' as Ref<FilterMode>
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

      fillProps?: Record<string, string>

      // Or list of values to select from
      values?: { icon?: Asset, label: IntlString, id: number | string }[]

      // If defined, documents will be set into value
      valueKey?: string
    }>
  }
})
export default view
