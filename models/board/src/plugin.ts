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

import { boardId, Card, CardAction } from '@anticrm/board'
import board from '@anticrm/board-resources/src/plugin'
import type { Ref, Space } from '@anticrm/core'
import { mergeIds, Resource } from '@anticrm/platform'
import { KanbanTemplate, Sequence } from '@anticrm/task'
import type { AnyComponent } from '@anticrm/ui'
import { ViewletDescriptor } from '@anticrm/view'

export default mergeIds(boardId, board, {
  component: {
    CreateBoard: '' as AnyComponent,
    CreateCard: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    CardPresenter: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    Cards: '' as AnyComponent,
    KanbanView: '' as AnyComponent
  },
  cardAction: {
    Members: '' as Ref<CardAction>,
    Labels: '' as Ref<CardAction>,
    Checklist: '' as Ref<CardAction>,
    Dates: '' as Ref<CardAction>,
    Attachments: '' as Ref<CardAction>,
    CustomFields: '' as Ref<CardAction>,
    AddButton: '' as Ref<CardAction>,
    Move: '' as Ref<CardAction>,
    Copy: '' as Ref<CardAction>,
    MakeTemplate: '' as Ref<CardAction>,
    Watch: '' as Ref<CardAction>,
    Archive: '' as Ref<CardAction>
  },
  cardActionHandler: {
    Members: '' as Resource<(card: Card) => void>,
    Labels: '' as Resource<(card: Card) => void>,
    Checklist: '' as Resource<(card: Card) => void>,
    Dates: '' as Resource<(card: Card) => void>,
    Attachments: '' as Resource<(card: Card) => void>,
    CustomFields: '' as Resource<(card: Card) => void>,
    AddButton: '' as Resource<(card: Card) => void>,
    Move: '' as Resource<(card: Card) => void>,
    Copy: '' as Resource<(card: Card) => void>,
    MakeTemplate: '' as Resource<(card: Card) => void>,
    Watch: '' as Resource<(card: Card) => void>,
    Archive: '' as Resource<(card: Card) => void>
  },
  space: {
    DefaultBoard: '' as Ref<Space>
  },
  template: {
    DefaultBoard: '' as Ref<KanbanTemplate>
  },
  ids: {
    Sequence: '' as Ref<Sequence>
  },
  viewlet: {
    Kanban: '' as Ref<ViewletDescriptor>
  }
})
