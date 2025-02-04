import type { Message, CardID, ID } from './message'

export type ContextID = ID & { context: true }

export interface Notification {
  message: Message
  context: ContextID
  read: boolean
  archived: boolean
}

export interface NotificationContext {
  id: ContextID
  card: CardID
  workspace: string
  personalWorkspace: string
  archivedFrom?: Date
  lastView?: Date
  lastUpdate?: Date
}

export interface NotificationContextUpdate {
  archivedFrom?: Date
  lastView?: Date
  lastUpdate?: Date
}
