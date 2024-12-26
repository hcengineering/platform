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
  ThreadID
} from '@hcengineering/communication-types'
import type { FindMessagesParams } from '@hcengineering/communication-types'

import type { BroadcastEvent } from './event.ts'

export interface Client {
  createMessage(thread: ThreadID, content: RichText, creator: SocialID): Promise<MessageID>
  removeMessage(thread: ThreadID, id: MessageID): Promise<void>
  createPatch(thread: ThreadID, message: MessageID, content: RichText, creator: SocialID): Promise<void>

  createReaction(thread: ThreadID, message: MessageID, reaction: string, creator: SocialID): Promise<void>
  removeReaction(thread: ThreadID, message: MessageID, reaction: string, creator: SocialID): Promise<void>

  createAttachment(thread: ThreadID, message: MessageID, card: CardID, creator: SocialID): Promise<void>
  removeAttachment(thread: ThreadID, message: MessageID, card: CardID): Promise<void>

  createNotification(message: MessageID, context: ContextID): Promise<void>
  removeNotification(message: MessageID, context: ContextID): Promise<void>

  createNotificationContext(card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID>
  removeNotificationContext(context: ContextID): Promise<void>
  updateNotificationContext(context: ContextID, update: NotificationContextUpdate): Promise<void>

  onEvent(event: BroadcastEvent): void

  findMessages(params: FindMessagesParams, queryId?: number): Promise<Message[]>
  findNotificationContexts(params: FindNotificationContextParams, queryId?: number): Promise<NotificationContext[]>
  findNotifications(params: FindNotificationsParams, queryId?: number): Promise<Notification[]>

  unsubscribeQuery(id: number): Promise<void>
  close(): void
}
