import type {
  CardID,
  MessageID,
  Markdown,
  SocialID,
  BlobID,
  MessageType,
  CardType,
  MessageExtra,
  BlobParams,
  AttachmentData,
  AttachmentID,
  AttachmentUpdateData,
  Emoji,
  PersonUuid
} from '@hcengineering/communication-types'

import type { BaseEvent } from './common'

export enum MessageEventType {
  // Public events
  CreateMessage = 'createMessage',
  UpdatePatch = 'updatePatch',
  RemovePatch = 'removePatch',
  ReactionPatch = 'reactionPatch',
  /**
   * @deprecated Use AttachmentPatch instead
   */
  BlobPatch = 'blobPatch',
  AttachmentPatch = 'attachmentPatch',
  ThreadPatch = 'threadPatch'
}

export type PatchEvent =
  | UpdatePatchEvent
  | RemovePatchEvent
  | ReactionPatchEvent
  | BlobPatchEvent
  | AttachmentPatchEvent
  | ThreadPatchEvent

export type MessageEvent = CreateMessageEvent | PatchEvent

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
  reaction: Emoji
}

export interface RemoveReactionOperation {
  opcode: 'remove'
  reaction: Emoji
}

// For any user
export interface ReactionPatchEvent extends BaseEvent {
  type: MessageEventType.ReactionPatch

  cardId: CardID
  messageId: MessageID

  operation: AddReactionOperation | RemoveReactionOperation

  socialId: SocialID
  personUuid?: PersonUuid // Set by server
  date?: Date
}

export interface AttachBlobsOperation {
  opcode: 'attach'
  blobs: (BlobParams & { mimeType: string })[]
}

export interface DetachBlobsOperation {
  opcode: 'detach'
  blobIds: BlobID[]
}

export interface SetBlobsOperation {
  opcode: 'set'
  blobs: (BlobParams & { mimeType: string })[]
}

export interface UpdateBlobsOperation {
  opcode: 'update'
  blobs: BlobUpdateData[]
}

export type BlobUpdateData = { blobId: BlobID, mimeType?: string } & Partial<BlobParams>

/**
 * @deprecated Use AttachmentPatch instead
 */
export interface BlobPatchEvent extends BaseEvent {
  type: MessageEventType.BlobPatch

  cardId: CardID
  messageId: MessageID

  operations: (AttachBlobsOperation | DetachBlobsOperation | SetBlobsOperation | UpdateBlobsOperation)[]

  socialId: SocialID
  date?: Date
}

export interface AddAttachmentsOperation {
  opcode: 'add'
  attachments: AttachmentData[]
}

export interface RemoveAttachmentsOperation {
  opcode: 'remove'
  ids: AttachmentID[]
}

export interface SetAttachmentsOperation {
  opcode: 'set'
  attachments: AttachmentData[]
}

export interface UpdateAttachmentsOperation {
  opcode: 'update'
  attachments: AttachmentUpdateData[]
}

// For system and message author
export interface AttachmentPatchEvent extends BaseEvent {
  type: MessageEventType.AttachmentPatch

  cardId: CardID
  messageId: MessageID

  operations: (
    | AddAttachmentsOperation
    | RemoveAttachmentsOperation
    | SetAttachmentsOperation
    | UpdateAttachmentsOperation
  )[]

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
  update: {
    threadType: CardType
  }
}

// For system
export interface AddReplyOperation {
  opcode: 'addReply'
  threadId: CardID
}

// For system
export interface RemoveReplyOperation {
  opcode: 'removeReply'
  threadId: CardID
}

export interface ThreadPatchEvent extends BaseEvent {
  type: MessageEventType.ThreadPatch

  cardId: CardID
  messageId: MessageID

  operation: AttachThreadOperation | UpdateThreadOperation | AddReplyOperation | RemoveReplyOperation

  socialId: SocialID
  personUuid?: PersonUuid // Set by server
  date?: Date
}

export interface CreateMessageResult {
  messageId: MessageID
  created: Date
  blobId: BlobID
}

export type MessageEventResult = CreateMessageResult
