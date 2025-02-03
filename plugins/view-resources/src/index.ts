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
import ArrayEditor from './components/ArrayEditor.svelte'
import AttachedDocPanel from './components/AttachedDocPanel.svelte'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import BooleanTruePresenter from './components/BooleanTruePresenter.svelte'
import ClassAttributeBar from './components/ClassAttributeBar.svelte'
import ClassPresenter from './components/ClassPresenter.svelte'
import ClassRefPresenter from './components/ClassRefPresenter.svelte'
import CollaborativeDocEditor from './components/CollaborativeDocEditor.svelte'
import CollaborativeHTMLEditor from './components/CollaborativeHTMLEditor.svelte'
import ColorsPopup from './components/ColorsPopup.svelte'
import DateEditor from './components/DateEditor.svelte'
import DatePresenter from './components/DatePresenter.svelte'
import DateTimePresenter from './components/DateTimePresenter.svelte'
import DocAttributeBar from './components/DocAttributeBar.svelte'
import DocNavLink from './components/DocNavLink.svelte'
import DocReferencePresenter from './components/DocReferencePresenter.svelte'
import EditBoxPopup from './components/EditBoxPopup.svelte'
import EditDoc from './components/EditDoc.svelte'
import EnumArrayEditor from './components/EnumArrayEditor.svelte'
import EnumEditor from './components/EnumEditor.svelte'
import EnumPresenter from './components/EnumPresenter.svelte'
import FileSizePresenter from './components/FileSizePresenter.svelte'
import HTMLEditor from './components/HTMLEditor.svelte'
import HTMLPresenter from './components/HTMLPresenter.svelte'
import HyperlinkEditor from './components/HyperlinkEditor.svelte'
import HyperlinkEditorPopup from './components/HyperlinkEditorPopup.svelte'
import HyperlinkPresenter from './components/HyperlinkPresenter.svelte'
import IconPicker from './components/IconPicker.svelte'
import IntlStringPresenter from './components/IntlStringPresenter.svelte'
import MarkupDiffPresenter from './components/MarkupDiffPresenter.svelte'
import MarkupEditor from './components/MarkupEditor.svelte'
import MarkupEditorPopup from './components/MarkupEditorPopup.svelte'
import MarkupPresenter from './components/MarkupPresenter.svelte'
import Menu from './components/Menu.svelte'
import NumberEditor from './components/NumberEditor.svelte'
import NumberPresenter from './components/NumberPresenter.svelte'
import ObjectIcon from './components/ObjectIcon.svelte'
import ObjectMention from './components/ObjectMention.svelte'
import ObjectPresenter from './components/ObjectPresenter.svelte'
import RolePresenter from './components/RolePresenter.svelte'
import SearchSelector from './components/SearchSelector.svelte'
import SpaceHeader from './components/SpaceHeader.svelte'
import SpacePresenter from './components/SpacePresenter.svelte'
import SpaceRefPresenter from './components/SpaceRefPresenter.svelte'
import SpaceTypeSelector from './components/SpaceTypeSelector.svelte'
import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import Table from './components/Table.svelte'
import TableBrowser from './components/TableBrowser.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'
import UpDownNavigator from './components/UpDownNavigator.svelte'
import ValueSelector from './components/ValueSelector.svelte'
import ViewletContentView from './components/ViewletContentView.svelte'
import ViewletSettingButton from './components/ViewletSettingButton.svelte'
import ViewletPanelHeader from './components/ViewletPanelHeader.svelte'
import ArrayFilter from './components/filter/ArrayFilter.svelte'
import DateFilter from './components/filter/DateFilter.svelte'
import DateFilterPresenter from './components/filter/DateFilterPresenter.svelte'
import FilterBar from './components/filter/FilterBar.svelte'
import FilterTypePopup from './components/filter/FilterTypePopup.svelte'
import ObjectFilter from './components/filter/ObjectFilter.svelte'
import StringFilter from './components/filter/StringFilter.svelte'
import StringFilterPresenter from './components/filter/StringFilterPresenter.svelte'
import TimestampFilter from './components/filter/TimestampFilter.svelte'
import ValueFilter from './components/filter/ValueFilter.svelte'
import GithubPresenter from './components/linkPresenters/GithubPresenter.svelte'
import YoutubePresenter from './components/linkPresenters/YoutubePresenter.svelte'
import DividerPresenter from './components/list/DividerPresenter.svelte'
import GrowPresenter from './components/list/GrowPresenter.svelte'
import ListView from './components/list/ListView.svelte'
import SortableList from './components/list/SortableList.svelte'
import SortableListItem from './components/list/SortableListItem.svelte'
import TreeElement from './components/navigator/TreeElement.svelte'
import TreeItem from './components/navigator/TreeItem.svelte'
import TreeNode from './components/navigator/TreeNode.svelte'
import StatusPresenter from './components/status/StatusPresenter.svelte'
import StatusRefPresenter from './components/status/StatusRefPresenter.svelte'
import AudioViewer from './components/viewer/AudioViewer.svelte'
import ImageViewer from './components/viewer/ImageViewer.svelte'
import VideoViewer from './components/viewer/VideoViewer.svelte'
import PDFViewer from './components/viewer/PDFViewer.svelte'
import TextViewer from './components/viewer/TextViewer.svelte'
import FoldersBrowser from './components/folders/FoldersBrowser.svelte'

import { blobImageMetadata, blobVideoMetadata } from './blob'

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

import { AggregationMiddleware, AnalyticsMiddleware } from './middleware'
import { hideArchived, showEmptyGroups } from './viewOptions'
import {
  canArchiveSpace,
  canDeleteObject,
  canDeleteSpace,
  canEditSpace,
  canJoinSpace,
  canLeaveSpace,
  isClipboardAvailable
} from './visibilityTester'
export { canArchiveSpace, canDeleteObject, canDeleteSpace, canEditSpace } from './visibilityTester'
export { getActions, getContextActions, invokeAction, showMenu } from './actions'
export { default as ActionButton } from './components/ActionButton.svelte'
export { default as ActionHandler } from './components/ActionHandler.svelte'
export { default as BaseDocPresenter } from './components/BaseDocPresenter.svelte'
export { default as DocsNavigator } from './components/DocsNavigator.svelte'
export { default as FixedColumn } from './components/FixedColumn.svelte'
export { default as LinkPresenter } from './components/LinkPresenter.svelte'
export { default as MarkupDiffPresenter } from './components/MarkupDiffPresenter.svelte'
export { default as MarkupPresenter } from './components/MarkupPresenter.svelte'
export { default as MarkupPreviewPopup } from './components/MarkupPreviewPopup.svelte'
export { default as ContextMenu } from './components/Menu.svelte'
export { default as ObjectBox } from './components/ObjectBox.svelte'
export { default as ObjectBoxPopup } from './components/ObjectBoxPopup.svelte'
export { default as ObjectPresenter } from './components/ObjectPresenter.svelte'
export { default as ObjectSearchBox } from './components/ObjectSearchBox.svelte'
export { default as ParentsNavigator } from './components/ParentsNavigator.svelte'
export { default as SpaceTypeSelector } from './components/SpaceTypeSelector.svelte'
export { default as TableBrowser } from './components/TableBrowser.svelte'
export { default as ValueSelector } from './components/ValueSelector.svelte'
export { default as ViewletSelector } from './components/ViewletSelector.svelte'
export { default as ViewletsSettingButton } from './components/ViewletsSettingButton.svelte'
export { default as FilterButton } from './components/filter/FilterButton.svelte'
export { default as FilterRemovedNotification } from './components/filter/FilterRemovedNotification.svelte'
export { default as List } from './components/list/List.svelte'
export { default as NavLink } from './components/navigator/NavLink.svelte'
export { default as StatusPresenter } from './components/status/StatusPresenter.svelte'
export { default as StatusRefPresenter } from './components/status/StatusRefPresenter.svelte'
export { default as FoldersBrowser } from './components/folders/FoldersBrowser.svelte'
export { default as RelationsEditor } from './components/RelationsEditor.svelte'
export { default as ListView } from './components/list/ListView.svelte'

export * from './filter'
export * from './middleware'
export * from './selection'
export * from './status'
export * from './utils'
export * from './icons'
export * from './objectIterator'
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
  setActiveViewletId,
  type LoadingProps
} from './utils'
export * from './viewOptions'
export {
  ArrayEditor,
  BooleanEditor,
  BooleanPresenter,
  ClassAttributeBar,
  ClassPresenter,
  ColorsPopup,
  DateEditor,
  DocAttributeBar,
  DocNavLink,
  DocReferencePresenter,
  EditBoxPopup,
  EditDoc,
  EnumEditor,
  FilterBar,
  HTMLPresenter,
  HyperlinkEditor,
  IconPicker,
  MarkupEditor,
  Menu,
  NumberEditor,
  NumberPresenter,
  ObjectIcon,
  ObjectMention,
  SortableList,
  SortableListItem,
  SpaceHeader,
  SpacePresenter,
  StringEditor,
  StringPresenter,
  Table,
  TimestampPresenter,
  TreeElement,
  TreeItem,
  TreeNode,
  UpDownNavigator,
  ViewletContentView,
  ViewletSettingButton,
  ViewletPanelHeader
}

function PositionElementAlignment (e?: Event): PopupAlignment | undefined {
  return getEventPopupPositionElement(e)
}

export default async (): Promise<Resources> => ({
  actionImpl,
  component: {
    ArrayFilter,
    ArrayEditor,
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
    DateTimePresenter,
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
    CollaborativeDocEditor,
    CollaborativeHTMLEditor,
    ListView,
    GrowPresenter,
    DividerPresenter,
    SpaceRefPresenter,
    SpaceTypeSelector,
    EnumArrayEditor,
    EnumPresenter,
    FileSizePresenter,
    StatusPresenter,
    StatusRefPresenter,
    DateFilterPresenter,
    StringFilterPresenter,
    AttachedDocPanel,
    ObjectMention,
    SearchSelector,
    AudioViewer,
    ImageViewer,
    VideoViewer,
    PDFViewer,
    TextViewer,
    FoldersBrowser
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
    HideArchived: hideArchived,
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
    CreateDocMiddleware: AggregationMiddleware.create,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    AnalyticsMiddleware: AnalyticsMiddleware.create,
    CanDeleteObject: canDeleteObject,
    CanEditSpace: canEditSpace,
    CanArchiveSpace: canArchiveSpace,
    CanDeleteSpace: canDeleteSpace,
    CanJoinSpace: canJoinSpace,
    CanLeaveSpace: canLeaveSpace,
    IsClipboardAvailable: isClipboardAvailable,
    BlobImageMetadata: blobImageMetadata,
    BlobVideoMetadata: blobVideoMetadata
  }
})
