export type CardID = string
export type SocialID = string
export type RichText = string

export type ID = string
export type MessageID = ID & { message: true }

interface Object {
  creator: SocialID
  created: Date
}

export interface Message extends Object {
  id: MessageID
  content: RichText
  edited: Date
  reactions: Reaction[]
  attachments: Attachment[]
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
