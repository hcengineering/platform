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
  MessageData,
  Label,
  FindLabelsParams,
  LabelID,
  CardType,
  PatchData,
  File,
  BlobMetadata
} from '@hcengineering/communication-types'

export interface DbAdapter {
  createMessage(
    card: CardID,
    type: MessageType,
    content: RichText,
    creator: SocialID,
    created: Date,
    data?: MessageData,
    externalId?: string,
    id?: MessageID
  ): Promise<MessageID>
  removeMessages(card: CardID, ids?: MessageID[], socialIds?: SocialID[]): Promise<MessageID[]>

  createPatch(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    type: PatchType,
    data: PatchData,
    creator: SocialID,
    created: Date
  ): Promise<void>

  removePatches(card: CardID): Promise<void>

  createMessagesGroup(card: CardID, blobId: BlobID, fromDate: Date, toDate: Date, count: number): Promise<void>
  removeMessagesGroup(card: CardID, blobId: BlobID): Promise<void>

  createReaction(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    reaction: string,
    creator: SocialID,
    created: Date
  ): Promise<void>
  removeReaction(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    reaction: string,
    creator: SocialID
  ): Promise<void>

  createFile(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    blobId: BlobID,
    fileType: string,
    filename: string,
    size: number,
    meta: BlobMetadata | undefined,
    creator: SocialID,
    created: Date
  ): Promise<void>
  removeFiles(query: Partial<File>): Promise<void>

  createThread(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    thread: CardID,
    threadType: CardType,
    created: Date
  ): Promise<void>
  removeThreads(query: Partial<Thread>): Promise<void>
  updateThread(
    thread: CardID,
    update: {
      threadType?: CardType
      op?: 'increment' | 'decrement'
      lastReply?: Date
    }
  ): Promise<void>

  findMessages(params: FindMessagesParams): Promise<Message[]>
  findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]>
  findThread(thread: CardID): Promise<Thread | undefined>

  addCollaborators(card: CardID, cardType: CardType, collaborators: AccountID[], date?: Date): Promise<AccountID[]>
  removeCollaborators(card: CardID, collaborators?: AccountID[]): Promise<void>
  getCollaboratorsCursor(card: CardID, date: Date, size?: number): AsyncIterable<Collaborator[]>

  findCollaborators(params: FindCollaboratorsParams): Promise<Collaborator[]>
  updateCollaborators(params: FindCollaboratorsParams, data: Partial<Collaborator>): Promise<void>

  createNotification(context: ContextID, message: MessageID, created: Date): Promise<NotificationID>
  removeNotification(context: ContextID, account: AccountID, untilDate: Date): Promise<void>

  createContext(account: AccountID, card: CardID, lastUpdate: Date, lastView: Date): Promise<ContextID>
  updateContext(context: ContextID, account: AccountID, lastUpdate?: Date, lastView?: Date): Promise<void>
  removeContexts(query: Partial<NotificationContext>): Promise<void>

  findNotificationContexts(params: FindNotificationContextParams): Promise<NotificationContext[]>
  findNotifications(params: FindNotificationsParams): Promise<Notification[]>

  createLabel(label: LabelID, card: CardID, cardType: CardType, account: AccountID, created: Date): Promise<void>
  removeLabels(query: Partial<Label>): Promise<void>
  findLabels(params: FindLabelsParams): Promise<Label[]>
  updateLabels(params: FindLabelsParams, data: Partial<Label>): Promise<void>

  getAccountByPersonId(_id: string): Promise<AccountID | undefined>

  close(): void
}
