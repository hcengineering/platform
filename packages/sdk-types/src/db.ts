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

import {
  CardID,
  ContextID,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessageID,
  NotificationContext,
  Markdown,
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
  MessageExtra,
  Label,
  FindLabelsParams,
  LabelID,
  CardType,
  PatchData,
  NotificationContent,
  NotificationType,
  ComparisonOperator,
  BlobData,
  LinkPreviewData,
  LinkPreviewID
} from '@hcengineering/communication-types'

export interface DbAdapter {
  createMessage: (
    id: MessageID,
    cardId: CardID,
    type: MessageType,
    content: Markdown,
    extra: MessageExtra | undefined,
    creator: SocialID,
    created: Date
  ) => Promise<boolean>

  createPatch: (
    cardId: CardID,
    messageId: MessageID,
    messageCreated: Date,
    type: PatchType,
    data: PatchData,
    creator: SocialID,
    created: Date
  ) => Promise<void>

  createMessagesGroup: (cardId: CardID, blobId: BlobID, fromDate: Date, toDate: Date, count: number) => Promise<void>
  removeMessagesGroup: (cardId: CardID, blobId: BlobID) => Promise<void>

  setReaction: (cardId: CardID, messageId: MessageID, reaction: string, socialId: SocialID, date: Date) => Promise<void>
  removeReaction: (cardId: CardID, message: MessageID, reaction: string, socialId: SocialID, date: Date) => Promise<void>

  attachBlob: (cardId: CardID, messageId: MessageID, data: BlobData, socialId: SocialID, date: Date) => Promise<void>
  detachBlob: (card: CardID, messageId: MessageID, blobId: BlobID, socialId: SocialID, date: Date) => Promise<void>

  createLinkPreview: (
    cardId: CardID,
    messageId: MessageID,
    data: LinkPreviewData,
    socialId: SocialID,
    date: Date
  ) => Promise<LinkPreviewID>
  removeLinkPreview: (cardId: CardID, messageId: MessageID, id: LinkPreviewID) => Promise<void>

  attachThread: (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType, date: Date) => Promise<void>
  removeThreads: (query: RemoveThreadQuery) => Promise<void>
  updateThread: (thread: CardID, update: ThreadUpdates) => Promise<void>

  findMessages: (params: FindMessagesParams) => Promise<Message[]>
  findMessagesGroups: (params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  findThread: (threadId: CardID) => Promise<Thread | undefined>

  addCollaborators: (cardId: CardID, cardType: CardType, collaborators: AccountID[], date: Date) => Promise<AccountID[]>
  removeCollaborators: (cardId: CardID, accounts: AccountID[], unsafe?: boolean) => Promise<void>
  getCollaboratorsCursor: (cardId: CardID, date: Date, size?: number) => AsyncIterable<Collaborator[]>

  findCollaborators: (params: FindCollaboratorsParams) => Promise<Collaborator[]>
  updateCollaborators: (query: FindCollaboratorsParams, update: CollaboratorUpdates) => Promise<void>

  createNotification: (
    contextId: ContextID,
    message: MessageID,
    messageCreated: Date,
    type: NotificationType,
    read: boolean,
    content: NotificationContent | undefined,
    created: Date
  ) => Promise<NotificationID>
  updateNotification: (query: UpdateNotificationQuery, updates: NotificationUpdates) => Promise<void>
  removeNotifications: (contextId: ContextID, account: AccountID, ids: NotificationID[]) => Promise<NotificationID[]>

  createContext: (
    account: AccountID,
    cardId: CardID,
    lastUpdate: Date,
    lastView: Date,
    lastNotify?: Date
  ) => Promise<ContextID>
  updateContext: (contextId: ContextID, account: AccountID, updates: NotificationContextUpdates) => Promise<void>
  removeContext: (id: ContextID, account: AccountID) => Promise<void>

  findNotificationContexts: (params: FindNotificationContextParams) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams) => Promise<Notification[]>

  createLabel: (labelId: LabelID, cardId: CardID, cardType: CardType, account: AccountID, created: Date) => Promise<void>
  removeLabels: (query: RemoveLabelQuery) => Promise<void>
  findLabels: (params: FindLabelsParams) => Promise<Label[]>
  updateLabels: (cardId: CardID, update: LabelUpdates) => Promise<void>

  getAccountsByPersonIds: (ids: string[]) => Promise<AccountID[]>
  getNameByAccount: (id: AccountID) => Promise<string | undefined>
  getMessageCreated: (cardId: CardID, messageId: MessageID) => Promise<Date | undefined>
  isMessageInDb: (cardId: CardID, messageId: MessageID) => Promise<boolean>

  close: () => void
}

export type RemoveThreadQuery = Partial<Pick<Thread, 'cardId' | 'threadId' | 'messageId'>>
export type RemoveLabelQuery = Partial<Pick<Label, 'cardId' | 'labelId' | 'account'>>

export interface UpdateNotificationQuery {
  context: ContextID
  account: AccountID
  type?: NotificationType
  id?: NotificationID
  created?: Partial<Record<ComparisonOperator, Date>> | Date
}
export type NotificationUpdates = Partial<Pick<Notification, 'read'>>

export type NotificationContextUpdates = Partial<Pick<NotificationContext, 'lastView' | 'lastUpdate' | 'lastNotify'>>

export interface ThreadUpdates {
  threadType?: CardType
  lastReply?: Date
  repliesCountOp?: 'increment' | 'decrement'
}

export type CollaboratorUpdates = Partial<Collaborator>
export type LabelUpdates = Partial<Pick<Label, 'cardType'>>
