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
  BlobMetadata,
  NotificationContent,
  NotificationType,
  ComparisonOperator
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
  ): Promise<{ id: MessageID; created: Date }>
  removeMessages(card: CardID, query: RemoveMessageQuery): Promise<MessageID[]>

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
  removeFiles(card: CardID, query: RemoveFileQuery): Promise<void>

  createThread(
    card: CardID,
    message: MessageID,
    messageCreated: Date,
    thread: CardID,
    threadType: CardType,
    created: Date
  ): Promise<void>
  removeThreads(query: RemoveThreadQuery): Promise<void>
  updateThread(thread: CardID, update: ThreadUpdates): Promise<void>

  findMessages(params: FindMessagesParams): Promise<Message[]>
  findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]>
  findThread(thread: CardID): Promise<Thread | undefined>

  addCollaborators(card: CardID, cardType: CardType, collaborators: AccountID[], date?: Date): Promise<AccountID[]>
  removeCollaborators(card: CardID, query: RemoveCollaboratorsQuery): Promise<void>
  getCollaboratorsCursor(card: CardID, date: Date, size?: number): AsyncIterable<Collaborator[]>

  findCollaborators(params: FindCollaboratorsParams): Promise<Collaborator[]>
  updateCollaborators(query: FindCollaboratorsParams, update: CollaboratorUpdates): Promise<void>

  createNotification(
    context: ContextID,
    message: MessageID,
    messageCreated: Date,
    type: NotificationType,
    read: boolean,
    content: NotificationContent | undefined,
    created: Date
  ): Promise<NotificationID>
  updateNotification(query: UpdateNotificationQuery, updates: NotificationUpdates): Promise<void>
  removeNotifications(query: RemoveNotificationsQuery): Promise<NotificationID[]>

  createContext(
    account: AccountID,
    card: CardID,
    lastUpdate: Date,
    lastView: Date,
    lastNotify?: Date
  ): Promise<ContextID>
  updateContext(context: ContextID, account: AccountID, updates: NotificationContextUpdates): Promise<void>
  removeContexts(query: RemoveNotificationContextQuery): Promise<void>

  findNotificationContexts(params: FindNotificationContextParams): Promise<NotificationContext[]>
  findNotifications(params: FindNotificationsParams): Promise<Notification[]>

  createLabel(label: LabelID, card: CardID, cardType: CardType, account: AccountID, created: Date): Promise<void>
  removeLabels(query: RemoveLabelQuery): Promise<void>
  findLabels(params: FindLabelsParams): Promise<Label[]>
  updateLabels(card: CardID, update: LabelUpdates): Promise<void>

  getAccountsByPersonIds(ids: string[]): Promise<AccountID[]>

  close(): void
}

export type RemoveMessageQuery = {
  ids?: MessageID[]
  socialIds?: SocialID[]
}

export type RemoveFileQuery = Partial<Pick<File, 'message' | 'blobId'>>
export type RemoveThreadQuery = Partial<Pick<Thread, 'card' | 'thread' | 'message'>>
export type RemoveCollaboratorsQuery = {
  accounts?: AccountID[]
}
export type RemoveNotificationContextQuery = Partial<Pick<NotificationContext, 'id' | 'account' | 'card'>>
export type RemoveNotificationsQuery = {
  context: ContextID
  account: AccountID
  ids: NotificationID[]
}
export type RemoveLabelQuery = Partial<Pick<Label, 'card' | 'label' | 'account'>>

export type NotificationUpdates = Partial<Pick<Notification, 'read'>>
export type UpdateNotificationQuery = {
  context: ContextID
  account: AccountID
  type?: NotificationType
  id?: NotificationID
  created?: Partial<Record<ComparisonOperator, Date>> | Date
}

export type NotificationContextUpdates = Partial<Pick<NotificationContext, 'lastView' | 'lastUpdate' | 'lastNotify'>>

export type ThreadUpdates = {
  threadType?: CardType
  lastReply?: Date
  replies?: 'increment' | 'decrement'
}

export type CollaboratorUpdates = Partial<Collaborator>
export type LabelUpdates = Partial<Pick<Label, 'cardType'>>
