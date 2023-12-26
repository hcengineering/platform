//
// Copyright © 2020 Anticrm Platform Contributors.
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type Resources } from '@hcengineering/platform'
import { getEventPopupPositionElement, type PopupAlignment } from '@hcengineering/ui'
import { actionImpl } from './actionImpl'
import ActionsPopup from './components/ActionsPopup.svelte'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import BooleanTruePresenter from './components/BooleanTruePresenter.svelte'
import ClassAttributeBar from './components/ClassAttributeBar.svelte'
import ClassPresenter from './components/ClassPresenter.svelte'
import ClassRefPresenter from './components/ClassRefPresenter.svelte'
import ColorsPopup from './components/ColorsPopup.svelte'
import DateEditor from './components/DateEditor.svelte'
import DatePresenter from './components/DatePresenter.svelte'
import DocAttributeBar from './components/DocAttributeBar.svelte'
import DocNavLink from './components/DocNavLink.svelte'
import EditBoxPopup from './components/EditBoxPopup.svelte'
import EditDoc from './components/EditDoc.svelte'
import EnumArrayEditor from './components/EnumArrayEditor.svelte'
import EnumEditor from './components/EnumEditor.svelte'
import EnumPresenter from './components/EnumPresenter.svelte'
import DateFilter from './components/filter/DateFilter.svelte'
import FilterBar from './components/filter/FilterBar.svelte'
import FilterTypePopup from './components/filter/FilterTypePopup.svelte'
import ObjectFilter from './components/filter/ObjectFilter.svelte'
import StringFilter from './components/filter/StringFilter.svelte'
import StringFilterPresenter from './components/filter/StringFilterPresenter.svelte'
import TimestampFilter from './components/filter/TimestampFilter.svelte'
import ValueFilter from './components/filter/ValueFilter.svelte'
import CollaborativeHTMLEditor from './components/CollaborativeHTMLEditor.svelte'
import HTMLEditor from './components/HTMLEditor.svelte'
import HTMLPresenter from './components/HTMLPresenter.svelte'
import HyperlinkPresenter from './components/HyperlinkPresenter.svelte'
import HyperlinkEditor from './components/HyperlinkEditor.svelte'
import HyperlinkEditorPopup from './components/HyperlinkEditorPopup.svelte'
import IconPicker from './components/IconPicker.svelte'
import IntlStringPresenter from './components/IntlStringPresenter.svelte'
import GithubPresenter from './components/linkPresenters/GithubPresenter.svelte'
import YoutubePresenter from './components/linkPresenters/YoutubePresenter.svelte'
import DividerPresenter from './components/list/DividerPresenter.svelte'
import GrowPresenter from './components/list/GrowPresenter.svelte'
import ListView from './components/list/ListView.svelte'
import SortableList from './components/list/SortableList.svelte'
import SortableListItem from './components/list/SortableListItem.svelte'
import MarkupDiffPresenter from './components/MarkupDiffPresenter.svelte'
import MarkupEditor from './components/MarkupEditor.svelte'
import MarkupEditorPopup from './components/MarkupEditorPopup.svelte'
import MarkupPresenter from './components/MarkupPresenter.svelte'
import Menu from './components/Menu.svelte'
import TreeItem from './components/navigator/TreeItem.svelte'
import TreeNode from './components/navigator/TreeNode.svelte'
import TreeElement from './components/navigator/TreeElement.svelte'
import NumberEditor from './components/NumberEditor.svelte'
import NumberPresenter from './components/NumberPresenter.svelte'
import ObjectPresenter from './components/ObjectPresenter.svelte'
import RolePresenter from './components/RolePresenter.svelte'
import SpacePresenter from './components/SpacePresenter.svelte'
import SpaceRefPresenter from './components/SpaceRefPresenter.svelte'
import StatusPresenter from './components/status/StatusPresenter.svelte'
import StatusRefPresenter from './components/status/StatusRefPresenter.svelte'
import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import Table from './components/Table.svelte'
import TableBrowser from './components/TableBrowser.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'
import UpDownNavigator from './components/UpDownNavigator.svelte'
import ValueSelector from './components/ValueSelector.svelte'
import ViewletSettingButton from './components/ViewletSettingButton.svelte'
import DateFilterPresenter from './components/filter/DateFilterPresenter.svelte'
import ArrayFilter from './components/filter/ArrayFilter.svelte'
import SpaceHeader from './components/SpaceHeader.svelte'
import ViewletContentView from './components/ViewletContentView.svelte'

import {
  afterResult,
  arrayAllResult,
  arrayAnyResult,
  beforeResult,
  containsResult,
  dateCustom,
  dateMonth,
  dateNextMonth,
  dateNextWeek,
  dateNotSpecified,
  dateOutdated,
  dateToday,
  dateWeek,
  dateYesterday,
  nestedDontMatchResult,
  nestedMatchResult,
  objectInResult,
  objectNinResult,
  valueInResult,
  valueNinResult
} from './filter'

import { IndexedDocumentPreview } from '@hcengineering/presentation'
import { showEmptyGroups } from './viewOptions'
import { AggregationMiddleware } from './middleware'
export { getActions, invokeAction, getContextActions } from './actions'
export { default as ActionHandler } from './components/ActionHandler.svelte'
export { default as FilterButton } from './components/filter/FilterButton.svelte'
export { default as FixedColumn } from './components/FixedColumn.svelte'
export { default as SourcePresenter } from './components/inference/SourcePresenter.svelte'
export { default as LinkPresenter } from './components/LinkPresenter.svelte'
export { default as List } from './components/list/List.svelte'
export { default as MarkupDiffPresenter } from './components/MarkupDiffPresenter.svelte'
export { default as MarkupPresenter } from './components/MarkupPresenter.svelte'
export { default as MarkupPreviewPopup } from './components/MarkupPreviewPopup.svelte'
export { default as ContextMenu } from './components/Menu.svelte'
export { default as NavLink } from './components/navigator/NavLink.svelte'
export { default as ObjectBox } from './components/ObjectBox.svelte'
export { default as ObjectPresenter } from './components/ObjectPresenter.svelte'
export { default as ObjectSearchBox } from './components/ObjectSearchBox.svelte'
export { default as StatusPresenter } from './components/status/StatusPresenter.svelte'
export { default as StatusRefPresenter } from './components/status/StatusRefPresenter.svelte'
export { default as TableBrowser } from './components/TableBrowser.svelte'
export { default as ValueSelector } from './components/ValueSelector.svelte'
export { default as FilterRemovedNotification } from './components/filter/FilterRemovedNotification.svelte'
export { default as ParentsNavigator } from './components/ParentsNavigator.svelte'
export { default as ViewletSelector } from './components/ViewletSelector.svelte'
export { default as ViewletsSettingButton } from './components/ViewletsSettingButton.svelte'

export * from './filter'
export * from './selection'
export * from './utils'
export * from './status'
export * from './middleware'
export {
  buildModel,
  getActiveViewletId,
  getAdditionalHeader,
  getCategories,
  getCollectionCounter,
  getFiltredKeys,
  getObjectPresenter,
  getObjectPreview,
  groupBy,
  isCollectionAttr,
  type LoadingProps,
  setActiveViewletId
} from './utils'
export * from './viewOptions'
export {
  HTMLPresenter,
  Table,
  DateEditor,
  DocAttributeBar,
  EditDoc,
  ColorsPopup,
  Menu,
  SpacePresenter,
  UpDownNavigator,
  ViewletSettingButton,
  FilterBar,
  ClassAttributeBar,
  ClassPresenter,
  BooleanEditor,
  BooleanPresenter,
  NumberEditor,
  NumberPresenter,
  TimestampPresenter,
  SortableList,
  SortableListItem,
  MarkupEditor,
  TreeNode,
  TreeItem,
  TreeElement,
  StringEditor,
  DocNavLink,
  EnumEditor,
  StringPresenter,
  EditBoxPopup,
  SpaceHeader,
  ViewletContentView,
  HyperlinkEditor,
  IconPicker
}

function PositionElementAlignment (e?: Event): PopupAlignment | undefined {
  return getEventPopupPositionElement(e)
}

export default async (): Promise<Resources> => ({
  actionImpl,
  component: {
    ArrayFilter,
    ClassPresenter,
    ClassRefPresenter,
    ObjectFilter,
    DateFilter,
    ValueFilter,
    StringFilter,
    TimestampFilter,
    TableBrowser,
    SpacePresenter,
    StringEditor,
    StringPresenter,
    HyperlinkPresenter,
    HyperlinkEditor,
    HyperlinkEditorPopup,
    NumberEditor,
    NumberPresenter,
    BooleanPresenter,
    BooleanEditor,
    TimestampPresenter,
    DateEditor,
    DatePresenter,
    RolePresenter,
    ObjectPresenter,
    EditDoc,
    HTMLPresenter,
    IntlStringPresenter,
    GithubPresenter,
    YoutubePresenter,
    ActionsPopup,
    StringEditorPopup: EditBoxPopup,
    MarkupPresenter,
    MarkupDiffPresenter,
    MarkupEditor,
    MarkupEditorPopup,
    BooleanTruePresenter,
    EnumEditor,
    FilterTypePopup,
    ValueSelector,
    HTMLEditor,
    CollaborativeHTMLEditor,
    ListView,
    GrowPresenter,
    DividerPresenter,
    IndexedDocumentPreview,
    SpaceRefPresenter,
    EnumArrayEditor,
    EnumPresenter,
    StatusPresenter,
    StatusRefPresenter,
    DateFilterPresenter,
    StringFilterPresenter
  },
  popup: {
    PositionElementAlignment
  },
  function: {
    FilterArrayAllResult: arrayAllResult,
    FilterArrayAnyResult: arrayAnyResult,
    FilterObjectInResult: objectInResult,
    FilterObjectNinResult: objectNinResult,
    FilterValueInResult: valueInResult,
    FilterValueNinResult: valueNinResult,
    FilterBeforeResult: beforeResult,
    FilterAfterResult: afterResult,
    FilterContainsResult: containsResult,
    FilterNestedMatchResult: nestedMatchResult,
    FilterNestedDontMatchResult: nestedDontMatchResult,
    ShowEmptyGroups: showEmptyGroups,
    FilterDateOutdated: dateOutdated,
    FilterDateToday: dateToday,
    FilterDateYesterday: dateYesterday,
    FilterDateWeek: dateWeek,
    FilterDateNextWeek: dateNextWeek,
    FilterDateMonth: dateMonth,
    FilterDateNextMonth: dateNextMonth,
    FilterDateNotSpecified: dateNotSpecified,
    FilterDateCustom: dateCustom,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    CreateDocMiddleware: AggregationMiddleware.create
  }
})
