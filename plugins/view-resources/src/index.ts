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

import { Resources } from '@anticrm/platform'
import { actionImpl } from './actionImpl'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import ColorsPopup from './components/ColorsPopup.svelte'
import DateEditor from './components/DateEditor.svelte'
import DatePresenter from './components/DatePresenter.svelte'
import SpacePresenter from './components/SpacePresenter.svelte'
import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import EditDoc from './components/EditDoc.svelte'
import HTMLPresenter from './components/HTMLPresenter.svelte'
import IntlStringPresenter from './components/IntlStringPresenter.svelte'
import Menu from './components/Menu.svelte'
import NumberEditor from './components/NumberEditor.svelte'
import NumberPresenter from './components/NumberPresenter.svelte'
import ObjectPresenter from './components/ObjectPresenter.svelte'
import RolePresenter from './components/RolePresenter.svelte'
import Table from './components/Table.svelte'
import TableView from './components/TableView.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'
import UpDownNavigator from './components/UpDownNavigator.svelte'
import GithubPresenter from './components/linkPresenters/GithubPresenter.svelte'
import YoutubePresenter from './components/linkPresenters/YoutubePresenter.svelte'
import ActionsPopup from './components/ActionsPopup.svelte'
import CreateAttribute from './components/CreateAttribute.svelte'
import StringTypeEditor from './components/typeEditors/StringTypeEditor.svelte'
import BooleanTypeEditor from './components/typeEditors/BooleanTypeEditor.svelte'
import DateTypeEditor from './components/typeEditors/DateTypeEditor.svelte'
import NumberTypeEditor from './components/typeEditors/NumberTypeEditor.svelte'
import RefEditor from './components/typeEditors/RefEditor.svelte'
import DocAttributeBar from './components/DocAttributeBar.svelte'

export { getActions } from './actions'
export { default as ActionContext } from './components/ActionContext.svelte'
export { default as ActionHandler } from './components/ActionHandler.svelte'
export { default as ContextMenu } from './components/Menu.svelte'
export { default as TableBrowser } from './components/TableBrowser.svelte'
export { default as LinkPresenter } from './components/LinkPresenter.svelte'
export * from './context'
export * from './selection'
export { buildModel, getCollectionCounter, getObjectPresenter, LoadingProps } from './utils'
export { Table, TableView, DateEditor, DocAttributeBar, EditDoc, ColorsPopup, Menu, SpacePresenter, UpDownNavigator }

export default async (): Promise<Resources> => ({
  actionImpl: actionImpl,
  component: {
    CreateAttribute,
    StringTypeEditor,
    BooleanTypeEditor,
    NumberTypeEditor,
    RefEditor,
    DateTypeEditor,
    SpacePresenter,
    StringEditor,
    StringPresenter,
    NumberEditor,
    NumberPresenter,
    BooleanPresenter,
    BooleanEditor,
    TableView,
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
    ActionsPopup
  }
})
