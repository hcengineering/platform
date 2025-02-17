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
  Notification,
  BlobID,
  FindMessagesGroupsParams,
  MessagesGroup,
  WorkspaceID
} from '@hcengineering/communication-types'

export interface DbAdapter {
  createMessage(card: CardID, content: RichText, creator: SocialID, created: Date): Promise<MessageID>

  removeMessage(card: CardID, id: MessageID): Promise<MessageID | undefined>
  removeMessages(card: CardID, ids: MessageID[]): Promise<MessageID[]>

  createPatch(card: CardID, message: MessageID, content: RichText, creator: SocialID, created: Date): Promise<void>

  createMessagesGroup(
    card: CardID,
    blobId: BlobID,
    from_id: MessageID,
    to_id: MessageID,
    from_date: Date,
    to_date: Date,
    count: number
  ): Promise<void>

  createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void>

  removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void>

  createAttachment(message: MessageID, attachment: CardID, creator: SocialID, created: Date): Promise<void>

  removeAttachment(message: MessageID, attachment: CardID): Promise<void>

  findMessages(query: FindMessagesParams): Promise<Message[]>

  findMessagesGroups(query: FindMessagesGroupsParams): Promise<MessagesGroup[]>

  createNotification(message: MessageID, context: ContextID): Promise<void>

  removeNotification(message: MessageID, context: ContextID): Promise<void>

  createContext(personalWorkspace: WorkspaceID, card: CardID, lastView?: Date, lastUpdate?: Date): Promise<ContextID>

  updateContext(context: ContextID, update: NotificationContextUpdate): Promise<void>

  removeContext(context: ContextID): Promise<void>

  findContexts(
    params: FindNotificationContextParams,
    personalWorkspaces: WorkspaceID[],
    workspace?: WorkspaceID
  ): Promise<NotificationContext[]>

  findNotifications(
    params: FindNotificationsParams,
    personalWorkspace: WorkspaceID,
    workspace?: WorkspaceID
  ): Promise<Notification[]>

  close(): void
}
