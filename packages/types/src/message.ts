import type { Card, Ref, Blob } from '@hcengineering/core'

export type BlobID = Ref<Blob>
export type CardID = Ref<Card>
export type SocialID = string & { social: true }
export type RichText = string

export type ID = string
export type MessageID = ID & { message: true }

interface Object {
  creator: SocialID
  created: Date
}

export interface Message extends Object {
  id: MessageID
  card: CardID
  content: RichText
  edited: Date
  reactions: Reaction[]
  attachments: Attachment[]
}

export interface MessagesGroup {
  card: CardID
  startAt: Date
  endAt: Date
  blobId: Ref<Blob>
  count: number
}

export interface Patch extends Object {
  message: MessageID
  content: RichText
}

export interface Reaction extends Object {
  message: MessageID
  reaction: string
}

export interface Attachment extends Object {
  message: MessageID
  card: CardID
}
