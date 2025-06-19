import type {
  CardID,
  MessageID,
  Markdown,
  SocialID,
  BlobID,
  MessageType,
  CardType,
  LinkPreviewID,
  MessagesGroup,
  MessageExtra,
  BlobData,
  LinkPreviewData
} from '@hcengineering/communication-types'

import type { BaseEvent } from './common'

export enum MessageEventType {
  // Public events
  CreateMessage = 'createMessage',
  UpdatePatch = 'updatePatch',
  RemovePatch = 'removePatch',
  ReactionPatch = 'reactionPatch',
  BlobPatch = 'blobPatch',
  LinkPreviewPatch = 'linkPreviewPatch',
  ThreadPatch = 'threadPatch',

  // Internal events
  CreateMessagesGroup = 'createMessagesGroup',
  RemoveMessagesGroup = 'removeMessagesGroup'
}

export type PatchEvent =
  | UpdatePatchEvent
  | RemovePatchEvent
  | ReactionPatchEvent
  | BlobPatchEvent
  | LinkPreviewPatchEvent
  | ThreadPatchEvent

export type MessageEvent = CreateMessageEvent | PatchEvent | CreateMessagesGroupEvent | RemoveMessagesGroupEvent

export interface CreateMessageOptions {
  // Available for regular users (Not implemented yet)
  skipLinkPreviews?: boolean
  // Available only for system
  noNotify?: boolean
}
export interface UpdatePatchOptions {
  // Available for regular users (Not implemented yet)
  skipLinkPreviewsUpdate?: boolean
}

export interface CreateMessageEvent extends BaseEvent {
  type: MessageEventType.CreateMessage

  cardId: CardID
  cardType: CardType

  messageId?: MessageID
  messageType: MessageType

  content: Markdown
  extra?: MessageExtra

  socialId: SocialID
  date?: Date

  options?: CreateMessageOptions
}

// Available for author and system
export interface UpdatePatchEvent extends BaseEvent {
  type: MessageEventType.UpdatePatch

  cardId: CardID
  messageId: MessageID

  content?: Markdown
  extra?: MessageExtra

  socialId: SocialID
  date?: Date

  options?: UpdatePatchOptions
}

// Available for author and system
export interface RemovePatchEvent extends BaseEvent {
  type: MessageEventType.RemovePatch

  cardId: CardID
  messageId: MessageID

  socialId: SocialID
  date?: Date
}

export interface AddReactionOperation {
  opcode: 'add'
  reaction: string
}

export interface RemoveReactionOperation {
  opcode: 'remove'
  reaction: string
}

// For any user
export interface ReactionPatchEvent extends BaseEvent {
  type: MessageEventType.ReactionPatch

  cardId: CardID
  messageId: MessageID

  operation: AddReactionOperation | RemoveReactionOperation

  socialId: SocialID
  date?: Date
}

export interface AttachBlobsOperation {
  opcode: 'attach'
  blobs: BlobData[]
}

export interface DetachBlobsOperation {
  opcode: 'detach'
  blobIds: BlobID[]
}

export interface SetBlobsOperation {
  opcode: 'set'
  blobs: BlobData[]
}

// For system and message author
export interface BlobPatchEvent extends BaseEvent {
  type: MessageEventType.BlobPatch

  cardId: CardID
  messageId: MessageID

  operations: (AttachBlobsOperation | DetachBlobsOperation | SetBlobsOperation)[]

  socialId: SocialID
  date?: Date
}

// For any user
export interface AttachThreadOperation {
  opcode: 'attach'
  threadId: CardID
  threadType: CardType
}

// For system
export interface UpdateThreadOperation {
  opcode: 'update'
  threadId: CardID
  updates: {
    threadType?: CardType
    repliesCountOp?: 'increment' | 'decrement'
    lastReply?: Date
  }
}

export interface ThreadPatchEvent extends BaseEvent {
  type: MessageEventType.ThreadPatch

  cardId: CardID
  messageId: MessageID

  operation: AttachThreadOperation | UpdateThreadOperation

  socialId: SocialID
  date?: Date
}

export interface AttachLinkPreviewsOperation {
  opcode: 'attach'
  previews: (LinkPreviewData & { previewId: LinkPreviewID })[]
}

export interface DetachLinkPreviewsOperation {
  opcode: 'detach'
  previewIds: LinkPreviewID[]
}

export interface SetLinkPreviewsOperation {
  opcode: 'set'
  previews: (LinkPreviewData & { previewId: LinkPreviewID })[]
}

// For system and message author
export interface LinkPreviewPatchEvent extends BaseEvent {
  type: MessageEventType.LinkPreviewPatch
  cardId: CardID
  messageId: MessageID

  operations: (AttachLinkPreviewsOperation | DetachLinkPreviewsOperation | SetLinkPreviewsOperation)[]

  socialId: SocialID
  date?: Date
}

export interface CreateMessageResult {
  messageId: MessageID
  created: Date
}

export type MessageEventResult = CreateMessageResult

// Internal
export interface CreateMessagesGroupEvent extends BaseEvent {
  type: MessageEventType.CreateMessagesGroup
  group: MessagesGroup
  socialId: SocialID
  date?: Date
}

export interface RemoveMessagesGroupEvent extends BaseEvent {
  type: MessageEventType.RemoveMessagesGroup
  cardId: CardID
  blobId: BlobID
  socialId: SocialID
  date?: Date
}
