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
import type { Card } from '@anticrm/board'
import contact, { Employee } from '@anticrm/contact'
import type { TxOperations as Client, Ref } from '@anticrm/core'
import { Resources } from '@anticrm/platform'
import { UsersPopup } from '@anticrm/presentation'
import { showPopup } from '@anticrm/ui'

import BoardPresenter from './components/BoardPresenter.svelte'
import CardPresenter from './components/CardPresenter.svelte'
import CreateBoard from './components/CreateBoard.svelte'
import CreateCard from './components/CreateCard.svelte'
import EditCard from './components/EditCard.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import KanbanView from './components/KanbanView.svelte'
import AttachmentPicker from './components/popups/AttachmentPicker.svelte'
import CardLabelsPopup from './components/popups/CardLabelsPopup.svelte'
import MoveCard from './components/popups/MoveCard.svelte'
import DeleteCard from './components/popups/RemoveCard.svelte'
import DateRangePicker from './components/popups/DateRangePicker.svelte'
import CardDatePresenter from './components/presenters/DatePresenter.svelte'
import CardLabelPresenter from './components/presenters/LabelPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import WatchCard from './components/WatchCard.svelte'
import BoardHeader from './components/BoardHeader.svelte'
import board from './plugin'
import {
  addCurrentUser,
  canAddCurrentUser,
  isArchived,
  isUnarchived,
  archiveCard,
  unarchiveCard
} from './utils/CardUtils'
import { getPopupAlignment } from './utils/PopupUtils'

async function showMoveCardPopup (object: Card, client: Client, e?: Event): Promise<void> {
  showPopup(MoveCard, { object }, getPopupAlignment(e))
}

async function showDeleteCardPopup (object: Card, client: Client, e?: Event): Promise<void> {
  showPopup(DeleteCard, { object }, getPopupAlignment(e))
}

async function showDatePickerPopup (object: Card, client: Client, e?: Event): Promise<void> {
  showPopup(DateRangePicker, { object }, getPopupAlignment(e))
}

async function showCardLabelsPopup (object: Card, client: Client, e?: Event): Promise<void> {
  showPopup(CardLabelsPopup, { object }, getPopupAlignment(e))
}

async function showEditMembersPopup (object: Card, client: Client, e?: Event): Promise<void> {
  showPopup(
    UsersPopup,
    {
      _class: contact.class.Employee,
      multiSelect: true,
      allowDeselect: true,
      selectedUsers: object?.members ?? [],
      placeholder: board.string.SearchMembers
    },
    getPopupAlignment(e),
    undefined,
    (result: Array<Ref<Employee>>) => {
      client.update(object, { members: result })
    }
  )
}

async function showAttachmentsPopup (object: Card, client: Client, e?: Event): Promise<void> {
  showPopup(AttachmentPicker, { object }, getPopupAlignment(e))
}

export default async (): Promise<Resources> => ({
  component: {
    CreateBoard,
    CreateCard,
    EditCard,
    KanbanCard,
    CardPresenter,
    CardDatePresenter,
    CardLabelPresenter,
    TemplatesIcon,
    KanbanView,
    BoardPresenter,
    WatchCard,
    BoardHeader
  },
  cardActionHandler: {
    Join: addCurrentUser,
    Move: showMoveCardPopup,
    Dates: showDatePickerPopup,
    Labels: showCardLabelsPopup,
    Attachments: showAttachmentsPopup,
    Archive: archiveCard,
    SendToBoard: unarchiveCard,
    Delete: showDeleteCardPopup,
    Members: showEditMembersPopup
  },
  cardActionSupportedHandler: {
    Join: canAddCurrentUser,
    Archive: isUnarchived,
    SendToBoard: isArchived,
    Delete: isArchived
  }
})
