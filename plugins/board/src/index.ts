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
import type { AttachedDoc, Class, Client, Doc, Markup, Ref } from '@anticrm/core'
import type { Asset, IntlString, Plugin, Resource } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { KanbanTemplateSpace, SpaceWithStates, Task } from '@anticrm/task'

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
  attachedTo: Ref<Board>

  title: string
  color: number
}

/**
 * @public
 */
export interface Card extends Task {
  title: string

  date?: {
    dueDate?: number
    isChecked?: boolean
    startDate?: number
  }
  description: Markup

  isArchived?: boolean

  members?: Ref<Employee>[]

  labels?: Ref<CardLabel>[]

  location: string

  coverColor?: number
  coverImage?: string

  comments?: number
  attachments?: number
}
/**
 * @public
 */
export interface CardAction extends Doc {
  hint?: IntlString
  icon: Asset
  isInline?: boolean
  kind?: 'primary' | 'secondary' | 'no-border' | 'transparent' | 'dangerous'
  label: IntlString
  position: number
  type: string
  handler?: Resource<(card: Card, client: Client) => void>
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
  cardActionType: {
    Editor: 'Editor',
    Cover: 'Cover',
    AddToCard: 'AddToCard',
    Automation: 'Automation',
    Action: 'Action'
  },
  class: {
    Board: '' as Ref<Class<Board>>,
    Card: '' as Ref<Class<Card>>,
    CardAction: '' as Ref<Class<CardAction>>,
    CardLabel: '' as Ref<Class<CardLabel>>
  },
  icon: {
    Board: '' as Asset,
    Card: '' as Asset
  },
  space: {
    BoardTemplates: '' as Ref<KanbanTemplateSpace>
  }
})

/**
 * @public
 */
export default boards
