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
