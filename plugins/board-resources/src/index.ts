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
import { type Resources } from '@hcengineering/platform'

import Archive from './components/Archive.svelte'
import BoardHeader from './components/BoardHeader.svelte'
import BoardMenu from './components/BoardMenu.svelte'
import BoardPresenter from './components/BoardPresenter.svelte'
import CardPresenter from './components/CardPresenter.svelte'
import CreateBoard from './components/CreateBoard.svelte'
import CreateCard from './components/CreateCard.svelte'
import EditCard from './components/EditCard.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import KanbanView from './components/KanbanView.svelte'
import LabelsView from './components/LabelsView.svelte'
import MenuMainPage from './components/MenuMainPage.svelte'
import TableView from './components/TableView.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import UserBoxList from './components/UserBoxList.svelte'
import CardCoverEditor from './components/editor/CardCoverEditor.svelte'
import CardCoverPicker from './components/popups/CardCoverPicker.svelte'
import CopyCard from './components/popups/CopyCard.svelte'
import DateRangePicker from './components/popups/DateRangePicker.svelte'
import MoveCard from './components/popups/MoveCard.svelte'
import CardCoverPresenter from './components/presenters/CardCoverPresenter.svelte'

export default async (): Promise<Resources> => ({
  component: {
    CreateBoard,
    CreateCard,
    LabelsView,
    EditCard,
    KanbanCard,
    CardPresenter,
    TemplatesIcon,
    KanbanView,
    BoardPresenter,
    BoardHeader,
    BoardMenu,
    Archive,
    MenuMainPage,
    TableView,
    UserBoxList,
    CardCoverEditor,
    CardCoverPresenter,
    // action popups
    DatesActionPopup: DateRangePicker,
    CoverActionPopup: CardCoverPicker,
    MoveActionPopup: MoveCard,
    CopyActionPopup: CopyCard
  }
})
