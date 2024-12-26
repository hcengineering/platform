import type { Message, Window, Notification } from '@hcengineering/communication-types'

export type QueryCallback<T> = (window: Window<T>) => void

export type MessagesQueryCallback = QueryCallback<Message>
export type NotificationsQueryCallback = QueryCallback<Notification>
