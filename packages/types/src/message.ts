//TODO: Import from @platform
export type CardID = string
export type SocialID = string
export type RichText = string

export type ID = bigint
export type MessageID = ID & { message: true }

interface Object {
  creator: SocialID
  created: number
}

export interface Message extends Object {
  id: MessageID
  content: RichText
  card: CardID
  version: number
  reactions: Reaction[]
  attachments: Attachment[]
}

export interface Reaction extends Object {
  message: MessageID
  reaction: number
}

export interface Attachment extends Object {
  message: MessageID
  card: CardID
}
