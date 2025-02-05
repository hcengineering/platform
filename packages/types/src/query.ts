import type { CardID, MessageID } from './message'
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
