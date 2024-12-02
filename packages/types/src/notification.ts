import type { Message, SocialID, CardID } from './message'

export interface Notification {
  message: Message
  socialId: SocialID
  read: boolean
  archived: boolean
}

export interface NotificationContext {
  card: CardID
  lastView: Date
  lastUpdate: Date
}
