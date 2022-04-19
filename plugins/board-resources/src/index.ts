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

import { showPopup } from '@anticrm/ui'
import { Card } from '@anticrm/board'
import { Resources } from '@anticrm/platform'
import CardPresenter from './components/CardPresenter.svelte'
import BoardPresenter from './components/BoardPresenter.svelte'
import CreateBoard from './components/CreateBoard.svelte'
import CreateCard from './components/CreateCard.svelte'
import EditCard from './components/EditCard.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import KanbanView from './components/KanbanView.svelte'
import CardLabelsPicker from './components/popups/CardLabelsPicker.svelte'
import MoveView from './components/popups/MoveCard.svelte'
import DateRangePicker from './components/popups/DateRangePicker.svelte'
import { addCurrentUser, canAddCurrentUser, isArchived, isUnarchived, archiveCard, unarchiveCard, deleteCard } from './utils/CardUtils'

async function showMoveCardPopup (object: Card): Promise<void> {
  showPopup(MoveView, { object })
}

async function showDatePickerPopup (object: Card): Promise<void> {
  showPopup(DateRangePicker, { object })
}

async function showCardLabelsPopup (object: Card): Promise<void> {
  showPopup(CardLabelsPicker, { object })
}

export default async (): Promise<Resources> => ({
  component: {
    CreateBoard,
    CreateCard,
    EditCard,
    KanbanCard,
    CardPresenter,
    TemplatesIcon,
    KanbanView,
    BoardPresenter
  },
  cardActionHandler: {
    Join: addCurrentUser,
    Move: showMoveCardPopup,
    Dates: showDatePickerPopup,
    Labels: showCardLabelsPopup,
    Archive: archiveCard,
    SendToBoard: unarchiveCard,
    Delete: deleteCard
  },
  cardActionSupportedHandler: {
    Join: canAddCurrentUser,
    Archive: isUnarchived,
    SendToBoard: isArchived,
    Delete: isArchived
  }
})
