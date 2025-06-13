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
  Message,
  MessageID,
  Patch,
  Reaction,
  SocialID,
  Thread,
  MessagesGroup,
  BlobID,
  CardType,
  LinkPreview,
  LinkPreviewID,
  AttachedBlob
} from '@hcengineering/communication-types'
import type { BaseResponseEvent } from './common'

export enum MessageResponseEventType {
  // Public events
  MessageCreated = 'messageCreated',
  PatchCreated = 'patchCreated',
  // MessageUpdated = 'messageUpdated',
  // MessageRemoved = 'messageRemoved',

  ThreadAttached = 'threadAttached',
  ThreadUpdated = 'threadUpdated',

  ReactionSet = 'reactionSet',
  ReactionRemoved = 'reactionRemoved',

  BlobAttached = 'blobAttached',
  BlobDetached = 'blobDetached',

  LinkPreviewCreated = 'linkPreviewCreated',
  LinkPreviewRemoved = 'linkPreviewRemoved',

  // Internal events
  MessagesGroupCreated = 'messagesGroupCreated',
  MessagesGroupRemoved = 'messagesGroupRemoved'
}

export type MessageResponseEvent =
  | MessageCreatedEvent
  | ReactionSetEvent
  | ReactionRemovedEvent
  | BlobAttachedEvent
  | BlobDetachedEvent
  | LinkPreviewCreatedEvent
  | LinkPreviewRemovedEvent
  | ThreadAttachedEvent
  | ThreadUpdatedEvent
  | PatchCreatedEvent
  | MessagesGroupCreatedEvent
  | MessagesGroupRemovedEvent

interface CreateMessageOptions {
  // Available for regular users (Not implemented yet)
  skipLinkPreviews?: boolean
  // Available only for system
  noNotify?: boolean
}
interface PatchMessageOptions {
  // Available for regular users (Not implemented yet)
  skipLinkPreviewsUpdate?: boolean
  // Available only for system (Not implemented yet)
  markAsUpdated?: boolean
}

// Public
export interface MessageCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessageCreated
  cardId: CardID
  cardType: CardType
  message: Message
  options?: CreateMessageOptions
}

export interface PatchCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.PatchCreated
  cardId: CardID
  messageId: MessageID
  messageCreated: Date
  patch: Patch
  options?: PatchMessageOptions
}

// export interface MessageUpdatedEvent extends BaseResponseEvent {
//   type: MessageResponseEventType.MessageUpdated
//   cardId: CardID
//   messageId: MessageID
//   content?: Markdown
//   extra?: MessageExtra
//   date: Date
//   socialId: SocialID
// }
//
// export interface MessageRemovedEvent extends BaseResponseEvent {
//   type: MessageResponseEventType.MessageRemoved
//   cardId: CardID
//   messageId: MessageID
//   date: Date
//   socialId: SocialID
// }

export interface ReactionSetEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ReactionSet
  cardId: CardID
  messageId: MessageID
  reaction: Reaction
}

export interface ReactionRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ReactionRemoved
  cardId: CardID
  messageId: MessageID
  reaction: string
  socialId: SocialID
  date: Date
}

export interface BlobAttachedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.BlobAttached
  cardId: CardID
  messageId: MessageID
  blob: AttachedBlob
}

export interface BlobDetachedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.BlobDetached
  cardId: CardID
  messageId: MessageID
  blobId: BlobID
  socialId: SocialID
  date: Date
}

export interface LinkPreviewCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.LinkPreviewCreated
  cardId: CardID
  messageId: MessageID
  linkPreview: LinkPreview
}

export interface LinkPreviewRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.LinkPreviewRemoved
  cardId: CardID
  messageId: MessageID
  previewId: LinkPreviewID
}

export interface ThreadAttachedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ThreadAttached
  cardId: CardID
  messageId: MessageID
  thread: Thread
}

export interface ThreadUpdatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.ThreadUpdated
  cardId: CardID
  messageId: MessageID
  threadId: CardID
  updates: {
    repliesCountOp: 'increment' | 'decrement'
    lastReply?: Date
  }
}

// Internal
export interface MessagesGroupCreatedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessagesGroupCreated
  group: MessagesGroup
}

export interface MessagesGroupRemovedEvent extends BaseResponseEvent {
  type: MessageResponseEventType.MessagesGroupRemoved
  cardId: CardID
  blobId: BlobID
}
