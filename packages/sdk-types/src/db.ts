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
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessageID,
  NotificationContext,
  RichText,
  SocialID,
  Notification,
  BlobID,
  FindMessagesGroupsParams,
  MessagesGroup,
  PatchType,
  Thread,
  AccountID,
  Collaborator,
  MessageType,
  FindCollaboratorsParams,
  NotificationID,
  MessageData
} from '@hcengineering/communication-types'

export interface DbAdapter {
  createMessage(
    card: CardID,
    type: MessageType,
    content: RichText,
    creator: SocialID,
    created: Date,
    data?: MessageData
  ): Promise<MessageID>
  removeMessages(card: CardID, ids: MessageID[], socialIds?: SocialID[]): Promise<MessageID[]>

  createPatch(
    card: CardID,
    message: MessageID,
    type: PatchType,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<void>

  createMessagesGroup(card: CardID, blobId: BlobID, fromSec: Date, toSec: Date, count: number): Promise<void>
  removeMessagesGroup(card: CardID, blobId: BlobID): Promise<void>

  createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void>
  removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void>

  createFile(
    card: CardID,
    message: MessageID,
    blobId: BlobID,
    fileType: string,
    filename: string,
    size: number,
    creator: SocialID,
    created: Date
  ): Promise<void>
  removeFile(card: CardID, message: MessageID, blobId: BlobID): Promise<void>

  createThread(card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void>
  updateThread(thread: CardID, op: 'increment' | 'decrement', lastReply?: Date): Promise<void>

  findMessages(params: FindMessagesParams): Promise<Message[]>
  findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]>
  findThread(thread: CardID): Promise<Thread | undefined>

  addCollaborators(card: CardID, collaborators: AccountID[], date?: Date): Promise<void>
  removeCollaborators(card: CardID, collaborators: AccountID[]): Promise<void>
  getCollaboratorsCursor(card: CardID, date: Date, size?: number): AsyncIterable<Collaborator[]>

  findCollaborators(params: FindCollaboratorsParams): Promise<Collaborator[]>

  createNotification(context: ContextID, message: MessageID, created: Date): Promise<NotificationID>
  removeNotification(context: ContextID, account: AccountID, untilDate: Date): Promise<void>

  createContext(account: AccountID, card: CardID, lastUpdate: Date, lastView: Date): Promise<ContextID>
  updateContext(context: ContextID, account: AccountID, lastUpdate?: Date, lastView?: Date): Promise<void>
  removeContext(context: ContextID, account: AccountID): Promise<void>

  findContexts(params: FindNotificationContextParams): Promise<NotificationContext[]>
  findNotifications(params: FindNotificationsParams): Promise<Notification[]>

  close(): void
}
