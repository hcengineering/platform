import type {
  CardID,
  ContextID,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessageID,
  NotificationContext,
  NotificationContextUpdate,
  RichText,
  SocialID,
  Notification
} from '@communication/types'

export interface DbAdapter {
  createMessage(content: RichText, creator: SocialID, created: Date): Promise<MessageID>
  removeMessage(id: MessageID): Promise<void>

  placeMessage(message: MessageID, card: CardID, workspace: string): Promise<void>
  createPatch(message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void>

  createReaction(message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void>
  removeReaction(message: MessageID, reaction: string, creator: SocialID): Promise<void>

  createAttachment(message: MessageID, card: CardID, creator: SocialID, created: Date): Promise<void>
  removeAttachment(message: MessageID, card: CardID): Promise<void>

  findMessages(workspace: string, query: FindMessagesParams): Promise<Message[]>

  createNotification(message: MessageID, context: ContextID): Promise<void>
  removeNotification(message: MessageID, context: ContextID): Promise<void>
  createContext(
    personWorkspace: string,
    workspace: string,
    card: CardID,
    lastView?: Date,
    lastUpdate?: Date
  ): Promise<ContextID>
  updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void>
  removeContext(context: ContextID): Promise<void>
  findContexts(
    params: FindNotificationContextParams,
    personWorkspaces: string[],
    workspace?: string
  ): Promise<NotificationContext[]>
  findNotifications(
    params: FindNotificationsParams,
    personWorkspace: string,
    workspace?: string
  ): Promise<Notification[]>

  close(): void
}
