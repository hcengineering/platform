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
import type { ContextID, NotificationID, NotificationType } from './notification'
import type { AccountID, BlobID, CardID, CardType } from './core'
import type { LabelID } from './label'

export { SortingOrder }

export type ComparisonOperator = 'less' | 'lessOrEqual' | 'greater' | 'greaterOrEqual' | 'notEqual'

export interface Window<T> {
  getResult: () => T[]

  loadNextPage: () => Promise<void>

  loadPrevPage: () => Promise<void>

  hasNextPage: () => boolean

  hasPrevPage: () => boolean
}

interface FindParams {
  order?: SortingOrder
  limit?: number
}

export interface FindMessagesParams extends FindParams {
  id?: MessageID
  card?: CardID
  attachments?: boolean
  reactions?: boolean
  replies?: boolean
  created?: Partial<Record<ComparisonOperator, Date>> | Date
}

export interface FindMessagesGroupsParams extends FindParams {
  messageId?: MessageID
  card?: CardID
  blobId?: BlobID
  patches?: boolean
  fromDate?: Partial<Record<ComparisonOperator, Date>> | Date
  toDate?: Partial<Record<ComparisonOperator, Date>> | Date
  orderBy?: 'fromDate' | 'toDate'
}

export interface FindNotificationContextParams extends FindParams {
  id?: ContextID
  card?: CardID | CardID[]
  lastNotify?: Partial<Record<ComparisonOperator, Date>> | Date
  account?: AccountID | AccountID[]
  notifications?: {
    type?: NotificationType
    message?: boolean
    limit: number
    order: SortingOrder
    read?: boolean
  }
}

export interface FindNotificationsParams extends FindParams {
  id?: NotificationID
  messageId?: MessageID
  type?: NotificationType
  context?: ContextID
  read?: boolean
  created?: Partial<Record<ComparisonOperator, Date>> | Date
  account?: AccountID | AccountID[]
  card?: CardID
  message?: boolean
}

export interface FindCollaboratorsParams extends FindParams {
  card: CardID
  account?: AccountID | AccountID[]
}

export interface FindLabelsParams extends FindParams {
  label?: LabelID | LabelID[]
  card?: CardID
  cardType?: CardType | CardType[]
  account?: AccountID
}
