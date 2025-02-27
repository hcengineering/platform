import type { Message, Window, Notification } from '@hcengineering/communication-types'

import type { Client } from './client'

export type QueryClient = Pick<
  Client,
  | 'onEvent'
  | 'findMessages'
  | 'findMessagesGroups'
  | 'findNotificationContexts'
  | 'findNotifications'
  | 'unsubscribeQuery'
  | 'close'
>

export type QueryCallback<T> = (window: Window<T>) => void

export type MessagesQueryCallback = QueryCallback<Message>
export type NotificationsQueryCallback = QueryCallback<Notification>
