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
  Attachment,
  CardID,
  ContextID,
  Message,
  MessageID,
  NotificationContext,
  NotificationContextUpdate,
  Patch,
  Reaction,
  SocialID,
  Notification,
  Thread
} from '@hcengineering/communication-types'

export enum ResponseEventType {
  MessageCreated = 'messageCreated',
  MessageRemoved = 'messageRemoved',
  PatchCreated = 'patchCreated',
  ReactionCreated = 'reactionCreated',
  ReactionRemoved = 'reactionRemoved',
  AttachmentCreated = 'attachmentCreated',
  AttachmentRemoved = 'attachmentRemoved',
  ThreadCreated = 'threadCreated',
  NotificationCreated = 'notificationCreated',
  NotificationRemoved = 'notificationRemoved',
  NotificationContextCreated = 'notificationContextCreated',
  NotificationContextRemoved = 'notificationContextRemoved',
  NotificationContextUpdated = 'notificationContextUpdated'
}

export type ResponseEvent =
  | MessageCreatedEvent
  | MessageRemovedEvent
  | PatchCreatedEvent
  | ReactionCreatedEvent
  | ReactionRemovedEvent
  | AttachmentCreatedEvent
  | AttachmentRemovedEvent
  | NotificationCreatedEvent
  | NotificationRemovedEvent
  | NotificationContextCreatedEvent
  | NotificationContextRemovedEvent
  | NotificationContextUpdatedEvent
  | ThreadCreatedEvent

export interface MessageCreatedEvent {
  type: ResponseEventType.MessageCreated
  message: Message
}

export interface MessageRemovedEvent {
  type: ResponseEventType.MessageRemoved
  card: CardID
  message: MessageID
}

export interface PatchCreatedEvent {
  type: ResponseEventType.PatchCreated
  card: CardID
  patch: Patch
}

export interface ReactionCreatedEvent {
  type: ResponseEventType.ReactionCreated
  card: CardID
  reaction: Reaction
}

export interface ReactionRemovedEvent {
  type: ResponseEventType.ReactionRemoved
  card: CardID
  message: MessageID
  reaction: string
  creator: SocialID
}

export interface AttachmentCreatedEvent {
  type: ResponseEventType.AttachmentCreated
  card: CardID
  attachment: Attachment
}

export interface AttachmentRemovedEvent {
  type: ResponseEventType.AttachmentRemoved
  card: CardID
  message: MessageID
  attachment: CardID
}

export interface ThreadCreatedEvent {
  type: ResponseEventType.ThreadCreated
  thread: Thread
}

export interface NotificationCreatedEvent {
  type: ResponseEventType.NotificationCreated
  personalWorkspace: string
  notification: Notification
}

export interface NotificationRemovedEvent {
  type: ResponseEventType.NotificationRemoved
  personalWorkspace: string
  message: MessageID
  context: ContextID
}

export interface NotificationContextCreatedEvent {
  type: ResponseEventType.NotificationContextCreated
  context: NotificationContext
}

export interface NotificationContextRemovedEvent {
  type: ResponseEventType.NotificationContextRemoved
  personalWorkspace: string
  context: ContextID
}

export interface NotificationContextUpdatedEvent {
  type: ResponseEventType.NotificationContextUpdated
  personalWorkspace: string
  context: ContextID
  update: NotificationContextUpdate
}
