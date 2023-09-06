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

import { Board, boardId } from '@hcengineering/board'
import board from '@hcengineering/board-resources/src/plugin'
import type { Ref } from '@hcengineering/core'
import { IntlString, mergeIds } from '@hcengineering/platform'
import { KanbanTemplate, Sequence } from '@hcengineering/task'
import type { AnyComponent } from '@hcengineering/ui'
import { Action, ViewAction, Viewlet, ViewletDescriptor } from '@hcengineering/view'

export default mergeIds(boardId, board, {
  component: {
    CreateBoard: '' as AnyComponent,
    LabelsView: '' as AnyComponent,
    CreateCard: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    CardPresenter: '' as AnyComponent,
    BoardPresenter: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    Cards: '' as AnyComponent,
    KanbanView: '' as AnyComponent,
    TableView: '' as AnyComponent,
    DatesActionPopup: '' as AnyComponent,
    CoverActionPopup: '' as AnyComponent,
    MoveActionPopup: '' as AnyComponent,
    CopyActionPopup: '' as AnyComponent,
    CardCoverPresenter: '' as AnyComponent,
    CardCoverEditor: '' as AnyComponent
  },
  space: {
    DefaultBoard: '' as Ref<Board>
  },
  template: {
    DefaultBoard: '' as Ref<KanbanTemplate>
  },
  ids: {
    Sequence: '' as Ref<Sequence>
  },
  viewlet: {
    KanbanCard: '' as Ref<Viewlet>,
    TableCard: '' as Ref<Viewlet>,
    Kanban: '' as Ref<ViewletDescriptor>,
    Table: '' as Ref<ViewletDescriptor>
  },
  string: {
    CommonBoardPreference: '' as IntlString,
    ConvertToCard: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  action: {
    EditStatuses: '' as Ref<Action>,
    ConvertToCard: '' as Ref<Action>
  },
  actionImpl: {
    ConvertToCard: '' as ViewAction
  }
})
