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
  NotificationContent,
  NotificationType,
  BlobData,
  LinkPreviewData,
  LinkPreviewID, BlobUpdateData
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
    type: PatchType,
    data: Record<string, any>,
    creator: SocialID,
    created: Date
  ) => Promise<void>

  createMessagesGroup: (cardId: CardID, blobId: BlobID, fromDate: Date, toDate: Date, count: number) => Promise<void>
  removeMessagesGroup: (cardId: CardID, blobId: BlobID) => Promise<void>

  addReaction: (cardId: CardID, messageId: MessageID, reaction: string, socialId: SocialID, date: Date) => Promise<void>
  removeReaction: (cardId: CardID, message: MessageID, reaction: string, socialId: SocialID, date: Date) => Promise<void>

  attachBlobs: (cardId: CardID, messageId: MessageID, data: BlobData[], socialId: SocialID, date: Date) => Promise<void>
  detachBlobs: (card: CardID, messageId: MessageID, blobId: BlobID[], socialId: SocialID, date: Date) => Promise<void>
  setBlobs: (cardId: CardID, messageId: MessageID, data: BlobData[], socialId: SocialID, date: Date) => Promise<void>
  updateBlobs: (cardId: CardID, messageId: MessageID, data: BlobUpdateData[], socialId: SocialID, date: Date) => Promise<void>

  attachLinkPreviews: (
    cardId: CardID,
    messageId: MessageID,
    data: (LinkPreviewData & { previewId: LinkPreviewID })[],
    socialId: SocialID,
    date: Date
  ) => Promise<void>
  detachLinkPreviews: (cardId: CardID, messageId: MessageID, ids: LinkPreviewID[], socialId: SocialID, date: Date) => Promise<void>
  setLinkPreviews: (cardId: CardID, messageId: MessageID, data: (LinkPreviewData & { previewId: LinkPreviewID })[], socialId: SocialID, date: Date) => Promise<void>

  attachThread: (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType, socialId: SocialID, date: Date) => Promise<void>
  removeThreads: (query: ThreadQuery) => Promise<void>
  updateThread: (cardId: CardID, messageId: MessageID, thread: CardID, update: ThreadUpdates, socialId: SocialID, date: Date) => Promise<void>

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
    content: NotificationContent,
    created: Date
  ) => Promise<NotificationID>
  updateNotification: (context: ContextID, account: AccountID, query: UpdateNotificationQuery, updates: NotificationUpdates) => Promise<void>
  removeNotifications: (contextId: ContextID, account: AccountID, ids: NotificationID[]) => Promise<NotificationID[]>

  createContext: (
    account: AccountID,
    cardId: CardID,
    lastUpdate: Date,
    lastView: Date,
    lastNotify?: Date
  ) => Promise<ContextID>
  updateContext: (contextId: ContextID, account: AccountID, updates: NotificationContextUpdates) => Promise<void>
  removeContext: (id: ContextID, account: AccountID) => Promise<ContextID | undefined>

  findNotificationContexts: (params: FindNotificationContextParams) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams) => Promise<Notification[]>

  createLabel: (labelId: LabelID, cardId: CardID, cardType: CardType, account: AccountID, created: Date) => Promise<void>
  removeLabels: (query: RemoveLabelQuery) => Promise<void>
  findLabels: (params: FindLabelsParams) => Promise<Label[]>
  updateLabels: (cardId: CardID, update: LabelUpdates) => Promise<void>

  getCardTitle: (cardId: CardID) => Promise<string | undefined>
  getAccountsByPersonIds: (ids: string[]) => Promise<AccountID[]>
  getNameByAccount: (id: AccountID) => Promise<string | undefined>
  getMessageCreated: (cardId: CardID, messageId: MessageID) => Promise<Date | undefined>
  isMessageInDb: (cardId: CardID, messageId: MessageID) => Promise<boolean>

  close: () => void
}

export type ThreadQuery = Partial<Pick<Thread, 'cardId' | 'threadId' | 'messageId'>>
export type RemoveLabelQuery = Partial<Pick<Label, 'cardId' | 'labelId' | 'account'>>

export interface UpdateNotificationQuery {
  type?: NotificationType
  id?: NotificationID
  untilDate?: Date
}
export type NotificationUpdates = Partial<Pick<Notification, 'read'>>

export type NotificationContextUpdates = Partial<Pick<NotificationContext, 'lastView' | 'lastUpdate' | 'lastNotify'>>

export interface ThreadUpdates {
  messageId?: MessageID
  threadType?: CardType
  lastReply?: Date
  repliesCountOp?: 'increment' | 'decrement'
}

export type CollaboratorUpdates = Partial<Collaborator>
export type LabelUpdates = Partial<Pick<Label, 'cardType'>>
