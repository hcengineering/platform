//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { SortingOrder } from '@hcengineering/core'

import type { MessageID } from './message'
import type { ContextID } from './notification'
import type { AccountID, BlobID, CardID } from './core'

export { SortingOrder }

export type ComparisonOperator = 'less' | 'lessOrEqual' | 'greater' | 'greaterOrEqual' | 'notEqual'

export interface Window<T> {
  getResult(): T[]

  loadNextPage(): Promise<void>

  loadPrevPage(): Promise<void>

  hasNextPage(): boolean

  hasPrevPage(): boolean
}

interface FindParams {
  order?: SortingOrder
  limit?: number
}

export interface FindMessagesParams extends FindParams {
  id?: MessageID
  card: CardID
  files?: boolean
  reactions?: boolean
  replies?: boolean
  created?: Partial<Record<ComparisonOperator, Date>> | Date
}

export interface FindMessagesGroupsParams extends FindParams {
  card: CardID
  blobId?: BlobID
  patches?: boolean
  fromSec?: Partial<Record<ComparisonOperator, Date>> | Date
  toSec?: Partial<Record<ComparisonOperator, Date>> | Date
  orderBy?: 'fromSec' | 'toSec'
}

export interface FindNotificationContextParams extends FindParams {
  id?: ContextID
  card?: CardID
  lastUpdate?: Partial<Record<ComparisonOperator, Date>> | Date
  account?: AccountID | AccountID[]
  notifications?: {
    message?: boolean
    limit: number
    order: SortingOrder
    read?: boolean
  }
}

export interface FindNotificationsParams extends FindParams {
  context?: ContextID
  read?: boolean
  created?: Partial<Record<ComparisonOperator, Date>> | Date
  account?: AccountID | AccountID[]
  message?: boolean
}

export interface FindCollaboratorsParams extends FindParams {
  card: CardID
  account?: AccountID | AccountID[]
}
