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

import { Employee } from '@anticrm/contact'
import type { AttachedDoc, Class, TxOperations as Client, Doc, Markup, Ref, Timestamp, Obj } from '@anticrm/core'
import type { Asset, IntlString, Plugin, Resource } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { KanbanTemplateSpace, SpaceWithStates, Task } from '@anticrm/task'
import type { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface Board extends SpaceWithStates {
  color?: number
  background?: string
}

/**
 * @public
 */
export interface BoardView extends SpaceWithStates {
  title: string
  type: 'table' | 'calendar'
  boards: Ref<Board>[]
}

/**
 * @public
 */
export interface CardLabel extends AttachedDoc {
  title: string
  color: number
  isHidden?: boolean
}

/**
 * @public
 */
export interface CardDate extends Obj {
  dueDate?: Timestamp
  isChecked?: boolean
  startDate?: Timestamp
}

/**
 * @public
 */
export interface CardChecklistItem extends Obj {
  assignee?: Ref<Employee>
  dueDate?: Timestamp
  isChecked: boolean
  name: Markup
}

/**
 * @public
 */
export interface CardChecklist extends Obj {
  items: CardChecklistItem[]
}

/**
 * @public
 */
export interface Card extends Task {
  title: string

  date?: CardDate
  description: Markup

  isArchived?: boolean

  members?: Ref<Employee>[]

  labels?: Ref<CardLabel>[]

  location?: string

  coverColor?: number
  coverImage?: string

  comments?: number
  attachments?: number
  checklists: CardChecklist[]
}
/**
 * @public
 */
export interface CardAction extends Doc {
  component?: AnyComponent
  hint?: IntlString
  icon: Asset
  isInline?: boolean
  kind?: 'primary' | 'secondary' | 'no-border' | 'transparent' | 'dangerous'
  label: IntlString
  position: number
  type: string
  handler?: Resource<(card: Card, client: Client, e?: Event) => void>
  supported?: Resource<(card: Card, client: Client) => boolean>
}

/**
 * @public
 */
export const boardId = 'board' as Plugin

/**
 * @public
 */
const boards = plugin(boardId, {
  app: {
    Board: '' as Ref<Doc>
  },
  class: {
    Board: '' as Ref<Class<Board>>,
    Card: '' as Ref<Class<Card>>,
    CardAction: '' as Ref<Class<CardAction>>,
    CardDate: '' as Ref<Class<CardDate>>,
    CardLabel: '' as Ref<Class<CardLabel>>,
    CardChecklist: '' as Ref<Class<CardChecklist>>,
    CardChecklistItem: '' as Ref<Class<CardChecklistItem>>
  },
  icon: {
    Board: '' as Asset,
    Card: '' as Asset
  },
  space: {
    BoardTemplates: '' as Ref<KanbanTemplateSpace>
  },
  cardActionType: {
    Suggested: 'Suggested',
    Editor: 'Editor',
    Cover: 'Cover',
    AddToCard: 'AddToCard',
    Automation: 'Automation',
    Action: 'Action'
  },
  cardAction: {
    Cover: '' as Ref<CardAction>,
    Join: '' as Ref<CardAction>,
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
    Archive: '' as Ref<CardAction>,
    SendToBoard: '' as Ref<CardAction>,
    Delete: '' as Ref<CardAction>
  },
  cardActionHandler: {
    Cover: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Join: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Members: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Labels: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Checklist: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Dates: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Attachments: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    CustomFields: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    AddButton: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Move: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Copy: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    MakeTemplate: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Watch: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Archive: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    SendToBoard: '' as Resource<(card: Card, client: Client, e?: Event) => void>,
    Delete: '' as Resource<(card: Card, client: Client, e?: Event) => void>
  },
  cardActionSupportedHandler: {
    Join: '' as Resource<(card: Card, client: Client) => boolean>,
    Archive: '' as Resource<(card: Card, client: Client) => boolean>,
    SendToBoard: '' as Resource<(card: Card, client: Client) => boolean>,
    Delete: '' as Resource<(card: Card, client: Client) => boolean>
  }
})

/**
 * @public
 */
export default boards
