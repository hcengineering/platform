import type {
  CardID,
  ContextID,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessageID,
  NotificationContext,
  NotificationContextUpdate,
  RichText,
  SocialID,
  Notification,
  FindMessagesGroupsParams,
  MessagesGroup
} from '@hcengineering/communication-types'
import type { FindMessagesParams } from '@hcengineering/communication-types'

import type { ResponseEvent } from './responseEvent.ts'

export interface Client {
  createMessage(card: CardID, content: RichText, creator: SocialID): Promise<MessageID>
  removeMessage(card: CardID, id: MessageID): Promise<void>
  updateMessage(card: CardID, message: MessageID, content: RichText, creator: SocialID): Promise<void>

  createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void>
  removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void>

  createAttachment(card: CardID, message: MessageID, attachment: CardID, creator: SocialID): Promise<void>
  removeAttachment(card: CardID, message: MessageID, attachment: CardID): Promise<void>

  createThread(card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void>

  createNotification(message: MessageID, context: ContextID): Promise<void>
  removeNotification(message: MessageID, context: ContextID): Promise<void>

  createNotificationContext(card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID>
  removeNotificationContext(context: ContextID): Promise<void>
  updateNotificationContext(context: ContextID, update: NotificationContextUpdate): Promise<void>

  onEvent(event: ResponseEvent): void

  findMessages(params: FindMessagesParams, queryId?: number): Promise<Message[]>
  findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]>
  findNotificationContexts(params: FindNotificationContextParams, queryId?: number): Promise<NotificationContext[]>
  findNotifications(params: FindNotificationsParams, queryId?: number): Promise<Notification[]>

  unsubscribeQuery(id: number): Promise<void>
  close(): void
}
