import type { Message, CardID, WorkspaceID } from './message'

export type ContextID = string & { context: true }

export interface Notification {
  message: Message
  context: ContextID
  read: boolean
  archived: boolean
}

export interface NotificationContext {
  id: ContextID
  card: CardID
  workspace: WorkspaceID
  personalWorkspace: WorkspaceID
  archivedFrom?: Date
  lastView?: Date
  lastUpdate?: Date
}

export interface NotificationContextUpdate {
  archivedFrom?: Date
  lastView?: Date
  lastUpdate?: Date
}
