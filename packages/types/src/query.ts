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

import type { BlobID, CardID, MessageID } from './message'
import type { ContextID } from './notification'

export { SortingOrder }

export type ComparisonOperator = 'less' | 'lessOrEqual' | 'greater' | 'greaterOrEqual' | 'notEqual'

type Exclusive<T> = {
  [K in keyof T]: Record<K, T[K]> & Partial<Record<Exclude<keyof T, K>, never>>
}[keyof T]

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
  created?: Exclusive<Record<ComparisonOperator, Date>> | Date
}

export interface FindNotificationsParams extends FindParams {
  context?: ContextID
  message?: MessageID
  read?: boolean
  archived?: boolean
  created?: Exclusive<Record<ComparisonOperator, Date>> | Date
}

export interface FindNotificationContextParams extends FindParams {
  id?: ContextID
  card?: CardID
}

export interface FindMessagesGroupsParams extends FindParams {
  card?: CardID
  blobId?: BlobID
  fromDate?: Partial<Record<ComparisonOperator, Date>> | Date
  toDate?: Partial<Record<ComparisonOperator, Date>> | Date
  orderBy?: 'fromDate' | 'toDate'
}
