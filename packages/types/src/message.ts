export type CardID = string
export type SocialID = string
export type ThreadID = string

export type ID = bigint
export type RichText = string

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
}

export type RichMessage = Message & {
  reactions: Reaction[]
  attachments: Attachment[]
  isPinned: boolean
  thread?: ThreadID
}

export interface Reaction extends Object {
  message: MessageID
  reaction: number // maybe string after emojis rework
}

export interface Attachment extends Object {
  message: MessageID
  card: CardID
}
