//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { Resources } from '@hcengineering/platform'
import { getEventPopupPositionElement, PopupAlignment } from '@hcengineering/ui'
import { actionImpl } from './actionImpl'
import ActionsPopup from './components/ActionsPopup.svelte'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import BooleanTruePresenter from './components/BooleanTruePresenter.svelte'
import ClassAttributeBar from './components/ClassAttributeBar.svelte'
import ClassPresenter from './components/ClassPresenter.svelte'
import ColorsPopup from './components/ColorsPopup.svelte'
import DateEditor from './components/DateEditor.svelte'
import DatePresenter from './components/DatePresenter.svelte'
import DocAttributeBar from './components/DocAttributeBar.svelte'
import EditBoxPopup from './components/EditBoxPopup.svelte'
import EditDoc from './components/EditDoc.svelte'
import EnumEditor from './components/EnumEditor.svelte'
import FilterBar from './components/filter/FilterBar.svelte'
import ObjectFilter from './components/filter/ObjectFilter.svelte'
import TimestampFilter from './components/filter/TimestampFilter.svelte'
import ValueFilter from './components/filter/ValueFilter.svelte'
import FilterTypePopup from './components/filter/FilterTypePopup.svelte'
import HTMLPresenter from './components/HTMLPresenter.svelte'
import IntlStringPresenter from './components/IntlStringPresenter.svelte'
import GithubPresenter from './components/linkPresenters/GithubPresenter.svelte'
import YoutubePresenter from './components/linkPresenters/YoutubePresenter.svelte'
import Menu from './components/Menu.svelte'
import NumberEditor from './components/NumberEditor.svelte'
import NumberPresenter from './components/NumberPresenter.svelte'
import ObjectPresenter from './components/ObjectPresenter.svelte'
import RolePresenter from './components/RolePresenter.svelte'
import SpacePresenter from './components/SpacePresenter.svelte'
import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import HyperlinkPresenter from './components/HyperlinkPresenter.svelte'
import Table from './components/Table.svelte'
import TableBrowser from './components/TableBrowser.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'
import UpDownNavigator from './components/UpDownNavigator.svelte'
import ViewletSettingButton from './components/ViewletSettingButton.svelte'
import ValueSelector from './components/ValueSelector.svelte'
import HTMLEditor from './components/HTMLEditor.svelte'
import SortableList from './components/list/SortableList.svelte'
import SortableListItem from './components/list/SortableListItem.svelte'
import SortableListItemPresenter from './components/list/SortableListItemPresenter.svelte'
import {
  afterResult,
  beforeResult,
  objectInResult,
  objectNinResult,
  valueInResult,
  valueNinResult,
  nestedMatchResult,
  nestedDontMatchResult
} from './filter'

function PositionElementAlignment (e?: Event): PopupAlignment | undefined {
  return getEventPopupPositionElement(e)
}

export { getActions, invokeAction } from './actions'
export { default as ActionContext } from './components/ActionContext.svelte'
export { default as ActionHandler } from './components/ActionHandler.svelte'
export { default as FilterButton } from './components/filter/FilterButton.svelte'
export { default as LinkPresenter } from './components/LinkPresenter.svelte'
export { default as ContextMenu } from './components/Menu.svelte'
export { default as TableBrowser } from './components/TableBrowser.svelte'
export { default as FixedColumn } from './components/FixedColumn.svelte'
export { default as ViewOptionsButton } from './components/ViewOptionsButton.svelte'
export { default as ValueSelector } from './components/ValueSelector.svelte'
export { default as ObjectBox } from './components/ObjectBox.svelte'
export * from './context'
export * from './filter'
export * from './selection'
export * from './viewOptions'
export {
  buildModel,
  getCollectionCounter,
  getObjectPresenter,
  LoadingProps,
  setActiveViewletId,
  getActiveViewletId
} from './utils'
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
  SortableListItemPresenter
}

export default async (): Promise<Resources> => ({
  actionImpl,
  component: {
    ClassPresenter,
    ObjectFilter,
    ValueFilter,
    TimestampFilter,
    TableBrowser,
    SpacePresenter,
    StringEditor,
    StringPresenter,
    HyperlinkPresenter,
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
    BooleanTruePresenter,
    EnumEditor,
    FilterTypePopup,
    ValueSelector,
    HTMLEditor
  },
  popup: {
    PositionElementAlignment
  },
  function: {
    FilterObjectInResult: objectInResult,
    FilterObjectNinResult: objectNinResult,
    FilterValueInResult: valueInResult,
    FilterValueNinResult: valueNinResult,
    FilterBeforeResult: beforeResult,
    FilterAfterResult: afterResult,
    FilterNestedMatchResult: nestedMatchResult,
    FilterNestedDontMatchResult: nestedDontMatchResult
  }
})
