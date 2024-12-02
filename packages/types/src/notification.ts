import type { Message } from './message'

type CardID = string
type HulyID = string

export interface Notification {
  message: Message
  user: HulyID
  read: boolean
  archived: boolean
}

export interface NotificationContext {
  card: CardID
  user: HulyID
  lastViewTimestamp: number
  lastUpdateTimestamp: number
}
