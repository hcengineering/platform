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
  FindNotificationContextParams,
  FindNotificationsParams,
  MessageID,
  NotificationContext,
  SocialID,
  Notification,
  AccountUuid,
  Collaborator,
  FindCollaboratorsParams,
  NotificationID,
  Label,
  FindLabelsParams,
  LabelID,
  CardType,
  NotificationContent,
  NotificationType,
  WithTotal,
  WorkspaceUuid,
  PeerKind,
  PeerExtra,
  FindPeersParams,
  Peer,
  FindThreadMetaParams,
  MessageMeta,
  ThreadMeta,
  FindMessagesMetaParams,
  BlobID
} from '@hcengineering/communication-types'

export interface DbAdapter {
  // MessageMeta
  createMessageMeta: (
    cardId: CardID,
    id: MessageID,
    creator: SocialID,
    created: Date,
    blob: BlobID
  ) => Promise<boolean>
  removeMessageMeta: (cardId: CardID, messageId: MessageID) => Promise<void>
  findMessagesMeta: (params: FindMessagesMetaParams) => Promise<MessageMeta[]>

  // ThreadsIndex
  attachThreadMeta: (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType, socialId: SocialID, date: Date) => Promise<void>
  removeThreadMeta: (query: ThreadMetaQuery) => Promise<void>
  updateThreadMeta: (query: ThreadMetaQuery, update: ThreadMetaUpdate) => Promise<void>
  findThreadMeta: (params: FindThreadMetaParams) => Promise<ThreadMeta[]>

  // Peers
  createPeer: (
    workspaceId: WorkspaceUuid,
    cardId: CardID,
    kind: PeerKind,
    value: string,
    extra: PeerExtra,
    date: Date
  ) => Promise<void>
  removePeer: (workspaceId: WorkspaceUuid,
    cardId: CardID,
    kind: PeerKind,
    value: string) => Promise<void>
  findPeers: (params: FindPeersParams) => Promise<Peer[]>

  // Collaborators
  addCollaborators: (cardId: CardID, cardType: CardType, collaborators: AccountUuid[], date: Date) => Promise<AccountUuid[]>
  removeCollaborators: (query: CollaboratorQuery) => Promise<void>
  updateCollaborators: (query: CollaboratorQuery, update: CollaboratorUpdate) => Promise<void>
  getCollaboratorsCursor: (cardId: CardID, date: Date, size?: number) => AsyncIterable<Collaborator[]>
  findCollaborators: (params: FindCollaboratorsParams) => Promise<Collaborator[]>

  // Notifications
  createNotification: (
    contextId: ContextID,
    messageId: MessageID,
    blobId: BlobID,
    type: NotificationType,
    read: boolean,
    content: NotificationContent,
    creator: SocialID,
    created: Date
  ) => Promise<NotificationID>
  updateNotification: (query: NotificationQuery, updates: NotificationUpdate) => Promise<number>
  removeNotifications: (query: NotificationQuery) => Promise<NotificationID[]>
  findNotifications: (params: FindNotificationsParams) => Promise<WithTotal<Notification>>

  // NotificationContext
  createNotificationContext: (
    account: AccountUuid,
    cardId: CardID,
    lastUpdate: Date,
    lastView: Date,
    lastNotify: Date
  ) => Promise<ContextID>
  updateContext: (query: NotificationContextQuery, updates: NotificationContextUpdate) => Promise<void>
  removeContext: (query: NotificationContextQuery) => Promise<ContextID | undefined>
  findNotificationContexts: (params: FindNotificationContextParams) => Promise<NotificationContext[]>

  // Labels
  createLabel: (cardId: CardID, cardType: CardType, labelId: LabelID, account: AccountUuid, created: Date) => Promise<void>
  removeLabels: (query: LabelQuery) => Promise<void>
  updateLabels: (query: LabelQuery, update: LabelUpdate) => Promise<void>
  findLabels: (params: FindLabelsParams) => Promise<Label[]>

  // Other
  getCardTitle: (cardId: CardID) => Promise<string | undefined>
  getCardSpaceMembers: (cardId: CardID) => Promise<AccountUuid[]>
  getAccountsByPersonIds: (ids: string[]) => Promise<AccountUuid[]>
  getNameByAccount: (id: AccountUuid) => Promise<string | undefined>

  close: () => void
}

export type ThreadMetaQuery = Partial<Pick<ThreadMeta, 'cardId' | 'threadId' | 'messageId'>>
export type ThreadMetaUpdate = Partial<Pick<ThreadMeta, | 'threadType'>>

export type LabelQuery = Partial<Pick<Label, 'cardId' | 'labelId' | 'account'>>
export type LabelUpdate = Partial<Pick<Label, 'cardType'>>

export type NotificationContextQuery = Partial<Pick<NotificationContext, 'account' | 'id'>>
export type NotificationContextUpdate = Partial<Pick<NotificationContext, 'lastView' | 'lastUpdate' | 'lastNotify'>>

export type NotificationQuery = Partial<Pick<Notification, 'contextId' | 'account' | 'type'>> & {
  id?: NotificationID | NotificationID[]
  untilDate?: Date
}
export type NotificationUpdate = Pick<Notification, 'read'>

export type CollaboratorQuery = Pick<Collaborator, 'cardId'> & { account?: AccountUuid | AccountUuid[] }
export type CollaboratorUpdate = Partial<Collaborator>
