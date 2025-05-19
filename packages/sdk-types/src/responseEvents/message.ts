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
  Message,
  MessageID,
  Patch,
  Reaction,
  SocialID,
  Thread,
  MessagesGroup,
  BlobID,
  CardType
} from '@hcengineering/communication-types'
import type { BaseResponseEvent } from './common'

export enum MessageResponseEventType {
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
  MessagesGroupRemoved = 'messagesGroupRemoved'
}

export type MessageResponseEvent =
  | FileCreatedEvent
  | FileRemovedEvent
  | MessageCreatedEvent
  | MessagesGroupCreatedEvent
  | MessagesGroupRemovedEvent
  | MessagesRemovedEvent
  | PatchCreatedEvent
  | ReactionCreatedEvent
  | ReactionRemovedEvent
  | ThreadCreatedEvent
  | ThreadUpdatedEvent

export interface MessageCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessageCreated
  cardType: CardType
  message: Message
}

export interface MessagesRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessagesRemoved
  card: CardID
  messages: MessageID[]
}

export interface PatchCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.PatchCreated
  card: CardID
  patch: Patch
}

export interface ReactionCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ReactionCreated
  card: CardID
  reaction: Reaction
  messageCreated: Date
}

export interface ReactionRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ReactionRemoved
  card: CardID
  message: MessageID
  messageCreated: Date
  reaction: string
  creator: SocialID
}

export interface FileCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.FileCreated
  card: CardID
  file: File
}

export interface FileRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.FileRemoved
  card: CardID
  message: MessageID
  messageCreated: Date
  blobId: BlobID
  creator: SocialID
}

export interface MessagesGroupCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessagesGroupCreated
  group: MessagesGroup
}

export interface MessagesGroupRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessagesGroupRemoved
  card: CardID
  blobId: BlobID
}
export interface ThreadCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ThreadCreated
  thread: Thread
}

export interface ThreadUpdatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ThreadUpdated
  card: CardID
  message: MessageID
  thread: CardID
  updates: {
    replies: 'increment' | 'decrement'
    lastReply?: Date
  }
}
