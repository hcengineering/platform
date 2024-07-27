import type { Document, ObjectId } from 'bson'
import { Api } from 'telegram'
import { TelegramConnectionInterface } from './telegram'
import { TelegramMessage as OldTelegramMessage } from '@hcengineering/telegram'
import { Timestamp } from '@hcengineering/core'

export interface Doc extends Document {
  _id?: ObjectId
}

export interface UserRecord extends Doc {
  phone: string
  workspace: string
  userId: string
  email: string
  token: string
}

export interface LastMsgRecord extends Doc {
  workspace: string
  phone: string
  participantID: string
  channelID: string
  maxMsgId: number
  minMsgId: number
}

export interface User {
  email: string
  workspace: string
}

export interface TgUser extends User {
  phone: string
  conn: TelegramConnectionInterface
}

export interface Contact {
  firstName: string
  lastName: string
  phone: string
}

export interface Event {
  user: Api.User
  msg: Api.Message
}

export interface WorkspaceChannel {
  workspace: string
  value: string
}

export interface AttachedFile {
  size?: number
  file: Buffer
  type: string
  lastModified: number
  name: string
}

export interface TelegramMessage extends OldTelegramMessage {
  sendOn: Timestamp
}
