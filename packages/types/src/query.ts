import type { BlobID, CardID, MessageID } from './message'
import type { ContextID } from './notification'

export enum SortOrder {
  Asc = 1,
  Desc = -1
}

export enum Direction {
  Backward = 1,
  Forward = -1
}

export interface Window<T> {
  getResult(): T[]

  loadNextPage(): Promise<void>
  loadPrevPage(): Promise<void>

  hasNextPage(): boolean
  hasPrevPage(): boolean
}

interface FindParams {
  from?: Date
  excluded?: boolean
  direction?: Direction
  sort?: SortOrder
  limit?: number
}

export interface FindMessagesParams extends FindParams {
  id?: MessageID
  card?: CardID
}

export interface FindNotificationsParams extends FindParams {
  context?: ContextID
  message?: MessageID
  read?: boolean
  archived?: boolean
}

export interface FindNotificationContextParams extends FindParams {
  id?: ContextID
  card?: CardID
}

export type ComparisonOperator = 'less' | 'lessOrEqual' | 'greater' | 'greaterOrEqual' | 'notEqual'

type Exclusive<T> = {
  [K in keyof T]: Record<K, T[K]> & Partial<Record<Exclude<keyof T, K>, never>>
}[keyof T]

export interface FindMessagesGroupsParams {
  card?: CardID
  blobId?: BlobID
  fromId?: Exclusive<Record<ComparisonOperator, MessageID>> | MessageID
  toId?: Exclusive<Record<ComparisonOperator, MessageID>> | MessageID
  fromDate?: Exclusive<Record<ComparisonOperator, Date>> | Date
  toDate?: Exclusive<Record<ComparisonOperator, Date>> | Date
  limit?: number
  sortBy?: 'fromId' | 'toId' | 'fromDate' | 'toDate'
  sort?: SortOrder
}
