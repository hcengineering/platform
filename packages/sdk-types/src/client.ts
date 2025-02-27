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
