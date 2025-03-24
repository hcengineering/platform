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
  MessageID,
  RichText,
  SocialID,
  MessagesGroup,
  BlobID,
  AccountID,
  PatchType,
  MessageType,
  MessageData
} from '@hcengineering/communication-types'

export enum RequestEventType {
  CreateMessage = 'createMessage',
  RemoveMessages = 'removeMessages',

  CreatePatch = 'createPatch',

  CreateReaction = 'createReaction',
  RemoveReaction = 'removeReaction',

  CreateFile = 'createFile',
  RemoveFile = 'removeFile',

  CreateThread = 'createThread',
  UpdateThread = 'updateThread',

  CreateMessagesGroup = 'createMessagesGroup',
  RemoveMessagesGroup = 'removeMessagesGroup',

  AddCollaborators = 'addCollaborators',
  RemoveCollaborators = 'removeCollaborators',

  CreateNotification = 'createNotification',
  RemoveNotifications = 'removeNotifications',

  CreateNotificationContext = 'createNotificationContext',
  RemoveNotificationContext = 'removeNotificationContext',
  UpdateNotificationContext = 'updateNotificationContext'
}

type BaseRequestEvent = {
  _id?: string
}

export type RequestEvent =
  | AddCollaboratorsEvent
  | CreateFileEvent
  | CreateMessageEvent
  | CreateMessagesGroupEvent
  | CreateNotificationContextEvent
  | CreateNotificationEvent
  | CreatePatchEvent
  | CreateReactionEvent
  | CreateThreadEvent
  | RemoveFileEvent
  | RemoveCollaboratorsEvent
  | RemoveMessagesEvent
  | RemoveMessagesGroupEvent
  | RemoveNotificationContextEvent
  | RemoveNotificationsEvent
  | RemoveReactionEvent
  | UpdateNotificationContextEvent
  | UpdateThreadEvent

export interface CreateMessageEvent extends BaseRequestEvent {
  type: RequestEventType.CreateMessage
  messageType: MessageType
  card: CardID
  content: RichText
  creator: SocialID
  data?: MessageData
}

export interface RemoveMessagesEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveMessages
  card: CardID
  messages: MessageID[]
}

export interface CreatePatchEvent extends BaseRequestEvent {
  type: RequestEventType.CreatePatch
  patchType: PatchType
  card: CardID
  message: MessageID
  content: RichText
  creator: SocialID
}

export interface CreateReactionEvent extends BaseRequestEvent {
  type: RequestEventType.CreateReaction
  card: CardID
  message: MessageID
  reaction: string
  creator: SocialID
}

export interface RemoveReactionEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveReaction
  card: CardID
  message: MessageID
  reaction: string
  creator: SocialID
}

export interface CreateFileEvent extends BaseRequestEvent {
  type: RequestEventType.CreateFile
  card: CardID
  message: MessageID
  blobId: BlobID
  size: number
  fileType: string
  filename: string
  creator: SocialID
}

export interface RemoveFileEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveFile
  card: CardID
  message: MessageID
  blobId: BlobID
  creator: SocialID
}

export interface CreateThreadEvent extends BaseRequestEvent {
  type: RequestEventType.CreateThread
  card: CardID
  message: MessageID
  thread: CardID
}

export interface UpdateThreadEvent extends BaseRequestEvent {
  type: RequestEventType.UpdateThread
  thread: CardID
  replies: 'increment' | 'decrement'
  lastReply?: Date
}

export interface CreateNotificationEvent extends BaseRequestEvent {
  type: RequestEventType.CreateNotification
  context: ContextID
  message: MessageID
  created: Date
  account: AccountID
}

export interface RemoveNotificationsEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveNotifications
  context: ContextID
  account: AccountID
  untilDate: Date
}

export interface CreateNotificationContextEvent extends BaseRequestEvent {
  type: RequestEventType.CreateNotificationContext
  card: CardID
  account: AccountID
  lastView: Date
  lastUpdate: Date
}

export interface RemoveNotificationContextEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveNotificationContext
  context: ContextID
  account: AccountID
}

export interface UpdateNotificationContextEvent extends BaseRequestEvent {
  type: RequestEventType.UpdateNotificationContext
  context: ContextID
  account: AccountID
  lastView?: Date
  lastUpdate?: Date
}

export interface CreateMessagesGroupEvent extends BaseRequestEvent {
  type: RequestEventType.CreateMessagesGroup
  group: MessagesGroup
}

export interface RemoveMessagesGroupEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveMessagesGroup
  card: CardID
  blobId: BlobID
}

export interface AddCollaboratorsEvent extends BaseRequestEvent {
  type: RequestEventType.AddCollaborators
  card: CardID
  collaborators: AccountID[]
  date?: Date
}

export interface RemoveCollaboratorsEvent extends BaseRequestEvent {
  type: RequestEventType.RemoveCollaborators
  card: CardID
  collaborators: AccountID[]
}

export type EventResult = CreateMessageResult | CreateNotificationContextResult | {}

export interface CreateMessageResult {
  id: MessageID
}

export interface CreateNotificationContextResult {
  id: ContextID
}
