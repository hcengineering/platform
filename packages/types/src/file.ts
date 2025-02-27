import type { CardID, Message, MessageID, RichText, SocialID } from './message'

export interface FileMetadata {
  card: CardID
  title: string
  fromDate: Date
  toDate: Date
}

export interface FileMessage {
  id: MessageID
  content: RichText
  edited?: Date
  creator: SocialID
  created: Date
  reactions: FileReaction[]
  thread?: FileThread
}

export interface FileReaction {
  reaction: string
  creator: SocialID
  created: Date
}

export interface FileThread {
  thread: CardID
  repliesCount: number
  lastReply: Date
  replied: SocialID[]
}

export interface ParsedFile {
  metadata: FileMetadata
  messages: Message[]
}
