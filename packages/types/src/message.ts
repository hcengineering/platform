import type { Ref, Blob, PersonId, WorkspaceUuid } from '@hcengineering/core'
import type { Card } from '@hcengineering/card'

export type BlobID = Ref<Blob>
export type CardID = Ref<Card>
export type SocialID = PersonId
export type WorkspaceID = WorkspaceUuid
export type RichText = string

export type ID = string
export type MessageID = string & { message: true }

export interface Message {
  id: MessageID
  card: CardID
  content: RichText
  creator: SocialID
  created: Date

  edited?: Date
  thread?: Thread
  reactions: Reaction[]
  attachments: Attachment[]
}

export interface MessagesGroup {
  card: CardID
  blobId: BlobID
  fromId: MessageID
  toId: MessageID
  fromDate: Date
  toDate: Date
  count: number
  patches: Patch[]
}

export interface Patch {
  message: MessageID
  type: PatchType
  content: string
  creator: SocialID
  created: Date
}

export enum PatchType {
  update = 'update',
  addReaction = 'addReaction',
  removeReaction = 'removeReaction',
  addReply = 'addReply',
  removeReply = 'removeReply'
}

export interface Reaction {
  message: MessageID
  reaction: string
  creator: SocialID
  created: Date
}

export interface Attachment {
  message: MessageID
  card: CardID
  creator: SocialID
  created: Date
}

export interface Thread {
  card: CardID
  message: MessageID
  thread: CardID
  repliesCount: number
  lastReply: Date
}
