import type {
  CardID,
  MessageID,
  Markdown,
  SocialID,
  BlobID,
  MessageType,
  CardType,
  LinkPreviewID,
  PatchType,
  PatchData,
  MessagesGroup,
  MessageExtra,
  BlobData,
  LinkPreviewData
} from '@hcengineering/communication-types'

import type { BaseRequestEvent } from './common'

export enum MessageRequestEventType {
  // Public events
  CreateMessage = 'createMessage',
  CreatePatch = 'createPatch',
  // UpdateMessage = 'updateMessage',
  // RemoveMessage = 'removeMessage',

  AttachThread = 'attachThread',

  SetReaction = 'setReaction',
  RemoveReaction = 'removeReaction',

  AttachBlob = 'attachBlob',
  DetachBlob = 'removeBlob',

  CreateLinkPreview = 'createLinkPreview',
  RemoveLinkPreview = 'removeLinkPreview',

  // Internal events
  UpdateThread = 'updateThread',

  CreateMessagesGroup = 'createMessagesGroup',
  RemoveMessagesGroup = 'removeMessagesGroup'
}

export type MessageRequestEvent =
  | CreateMessageEvent
  | SetReactionEvent
  | RemoveReactionEvent
  | AttachBlobEvent
  | DetachBlobEvent
  | CreateLinkPreviewEvent
  | RemoveLinkPreviewEvent
  | CreatePatchEvent
  | UpdateThreadEvent
  | CreateMessagesGroupEvent
  | RemoveMessagesGroupEvent
  | AttachThreadEvent

export interface CreateMessageOptions {
  // Available for regular users (Not implemented yet)
  skipLinkPreviews?: boolean
  // Available only for system
  noNotify?: boolean
}
export interface PatchMessageOptions {
  // Available for regular users (Not implemented yet)
  skipLinkPreviewsUpdate?: boolean
  // Available only for system (Not implemented yet)
  markAsUpdated?: boolean
}

export interface CreateMessageEvent extends BaseRequestEvent {
  type: MessageRequestEventType.CreateMessage

  cardId: CardID
  cardType: CardType

  messageId?: MessageID
  messageType: MessageType

  content: Markdown
  extra?: MessageExtra

  socialId?: SocialID
  date?: Date

  options?: CreateMessageOptions
}

export interface CreatePatchEvent extends BaseRequestEvent {
  type: MessageRequestEventType.CreatePatch
  cardId: CardID
  messageId: MessageID

  patchType: PatchType
  data: PatchData

  socialId?: SocialID
  date?: Date

  options?: PatchMessageOptions
}

// export interface UpdateMessageEvent extends BaseRequestEvent {
//   type: MessageRequestEventType.UpdateMessage
//
//   cardId: CardID
//   messageId: MessageID
//
//   content?: Markdown
//   extra?: MessageExtra
//
//   socialId?: SocialID
//   date?: Date
//
//   options?: UpdateMessageOptions
// }
//
// export interface RemoveMessageEvent extends BaseRequestEvent {
//   type: MessageRequestEventType.RemoveMessage
//
//   cardId: CardID
//   messageId: MessageID
//
//   socialId?: SocialID
//   date?: Date
//
//   options?: RemoveMessageOptions
// }

export interface AttachThreadEvent extends BaseRequestEvent {
  type: MessageRequestEventType.AttachThread

  cardId: CardID
  messageId: MessageID

  threadId: CardID
  threadType: CardType

  socialId?: SocialID
  date?: Date
}

export interface SetReactionEvent extends BaseRequestEvent {
  type: MessageRequestEventType.SetReaction

  cardId: CardID
  messageId: MessageID

  reaction: string

  socialId?: SocialID
  date?: Date
}

export interface RemoveReactionEvent extends BaseRequestEvent {
  type: MessageRequestEventType.RemoveReaction

  cardId: CardID
  messageId: MessageID

  reaction: string

  socialId?: SocialID
  date?: Date
}

export interface AttachBlobEvent extends BaseRequestEvent {
  type: MessageRequestEventType.AttachBlob

  cardId: CardID
  messageId: MessageID

  blobData: BlobData

  socialId?: SocialID
  date?: Date
}

export interface DetachBlobEvent extends BaseRequestEvent {
  type: MessageRequestEventType.DetachBlob

  cardId: CardID
  messageId: MessageID

  blobId: BlobID

  socialId?: SocialID
  date?: Date
}

export interface CreateLinkPreviewEvent extends BaseRequestEvent {
  previewId?: string
  type: MessageRequestEventType.CreateLinkPreview

  cardId: CardID
  messageId: MessageID

  previewData: LinkPreviewData

  socialId?: SocialID
  date?: Date
}

export interface RemoveLinkPreviewEvent extends BaseRequestEvent {
  type: MessageRequestEventType.RemoveLinkPreview

  cardId: CardID
  messageId: MessageID

  previewId: LinkPreviewID

  socialId?: SocialID
  date?: Date
}

export interface CreateMessageResult {
  messageId: MessageID
  created: Date
}

export interface CreateLinkPreviewResult {
  previewId: MessageID
  created: Date
}

export type MessageEventResult = CreateMessageResult | CreateLinkPreviewResult

// Internal
export interface UpdateThreadEvent extends BaseRequestEvent {
  type: MessageRequestEventType.UpdateThread
  cardId: CardID
  messageId: MessageID
  threadId: CardID
  updates: {
    repliesCountOp: 'increment' | 'decrement'
    lastReply?: Date
  }
  socialId: SocialID
  date: Date
}

export interface CreateMessagesGroupEvent extends BaseRequestEvent {
  type: MessageRequestEventType.CreateMessagesGroup
  group: MessagesGroup
  socialId: SocialID
  date?: Date
}

export interface RemoveMessagesGroupEvent extends BaseRequestEvent {
  type: MessageRequestEventType.RemoveMessagesGroup
  cardId: CardID
  blobId: BlobID
  socialId: SocialID
  date?: Date
}
