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
  File,
  CardID,
  ContextID,
  Message,
  MessageID,
  NotificationContext,
  Patch,
  Reaction,
  SocialID,
  Notification,
  Thread,
  MessagesGroup,
  AccountID,
  BlobID
} from '@hcengineering/communication-types'

export enum ResponseEventType {
  MessageCreated = 'messageCreated',
  MessagesRemoved = 'messagesRemoved',

  PatchCreated = 'patchCreated',

  ReactionCreated = 'reactionCreated',
  ReactionRemoved = 'reactionRemoved',

  FileCreated = 'fileCreated',
  FileRemoved = 'fileRemoved',

  ThreadCreated = 'threadCreated',
  ThreadUpdated = 'threadUpdated',

  MessagesGroupCreated = 'messagesGroupCreated',

  NotificationCreated = 'notificationCreated',
  NotificationsRemoved = 'notificationsRemoved',

  NotificationContextCreated = 'notificationContextCreated',
  NotificationContextRemoved = 'notificationContextRemoved',
  NotificationContextUpdated = 'notificationContextUpdated',

  AddedCollaborators = 'addedCollaborators',
  RemovedCollaborators = 'removedCollaborators'
}

type BaseResponseEvent = {
  _id?: string
}

export type ResponseEvent =
  | MessageCreatedEvent
  | MessagesRemovedEvent
  | PatchCreatedEvent
  | ReactionCreatedEvent
  | ReactionRemovedEvent
  | FileCreatedEvent
  | FileRemovedEvent
  | NotificationCreatedEvent
  | NotificationsRemovedEvent
  | NotificationContextCreatedEvent
  | NotificationContextRemovedEvent
  | NotificationContextUpdatedEvent
  | ThreadCreatedEvent
  | MessagesGroupCreatedEvent
  | AddedCollaboratorsEvent
  | RemovedCollaboratorsEvent
  | ThreadUpdatedEvent

export interface MessageCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.MessageCreated
  message: Message
}

export interface MessagesRemovedEvent extends BaseResponseEvent {
  type: ResponseEventType.MessagesRemoved
  card: CardID
  messages: MessageID[]
}

export interface PatchCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.PatchCreated
  card: CardID
  patch: Patch
}

export interface ReactionCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.ReactionCreated
  card: CardID
  reaction: Reaction
}

export interface ReactionRemovedEvent extends BaseResponseEvent {
  type: ResponseEventType.ReactionRemoved
  card: CardID
  message: MessageID
  reaction: string
  creator: SocialID
}

export interface FileCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.FileCreated
  card: CardID
  file: File
}

export interface FileRemovedEvent extends BaseResponseEvent {
  type: ResponseEventType.FileRemoved
  card: CardID
  message: MessageID
  blobId: BlobID
  creator: SocialID
}

export interface MessagesGroupCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.MessagesGroupCreated
  group: MessagesGroup
}

export interface ThreadCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.ThreadCreated
  thread: Thread
}

export interface NotificationCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.NotificationCreated
  notification: Notification
  account: AccountID
}

export interface NotificationsRemovedEvent extends BaseResponseEvent {
  type: ResponseEventType.NotificationsRemoved
  untilDate: Date
  context: ContextID
  account: AccountID
}

export interface NotificationContextCreatedEvent extends BaseResponseEvent {
  type: ResponseEventType.NotificationContextCreated
  context: NotificationContext
}

export interface NotificationContextRemovedEvent extends BaseResponseEvent {
  type: ResponseEventType.NotificationContextRemoved
  context: ContextID
  account: AccountID
}

export interface NotificationContextUpdatedEvent extends BaseResponseEvent {
  type: ResponseEventType.NotificationContextUpdated
  context: ContextID
  account: AccountID
  lastView?: Date
  lastUpdate?: Date
}

export interface AddedCollaboratorsEvent extends BaseResponseEvent {
  type: ResponseEventType.AddedCollaborators
  card: CardID
  collaborators: AccountID[]
}

export interface RemovedCollaboratorsEvent extends BaseResponseEvent {
  type: ResponseEventType.RemovedCollaborators
  card: CardID
  collaborators: AccountID[]
}

export interface ThreadUpdatedEvent extends BaseResponseEvent {
  type: ResponseEventType.ThreadUpdated
  thread: CardID
  replies: 'increment' | 'decrement'
  lastReply?: Date
}
