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
  WorkspaceID,
  PatchType,
  Thread
} from '@hcengineering/communication-types'

export interface DbAdapter {
  createMessage(card: CardID, content: RichText, creator: SocialID, created: Date): Promise<MessageID>
  removeMessage(card: CardID, id: MessageID, socialIds?: SocialID[]): Promise<void>
  removeMessages(card: CardID, fromId: MessageID, toId: MessageID): Promise<void>

  createPatch(
    card: CardID,
    message: MessageID,
    type: PatchType,
    content: RichText,
    creator: SocialID,
    created: Date
  ): Promise<void>
  removePatches(card: CardID, fromId: MessageID, toId: MessageID): Promise<void>

  createMessagesGroup(
    card: CardID,
    blobId: BlobID,
    fromDate: Date,
    toDate: Date,
    fromID: MessageID,
    toID: MessageID,
    count: number
  ): Promise<void>
  removeMessagesGroup(card: CardID, blobId: BlobID): Promise<void>

  createReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID, created: Date): Promise<void>
  removeReaction(card: CardID, message: MessageID, reaction: string, creator: SocialID): Promise<void>

  createAttachment(message: MessageID, attachment: CardID, creator: SocialID, created: Date): Promise<void>
  removeAttachment(message: MessageID, attachment: CardID): Promise<void>

  createThread(card: CardID, message: MessageID, thread: CardID, created: Date): Promise<void>
  updateThread(thread: CardID, lastReply: Date, op: 'increment' | 'decrement'): Promise<void>

  findMessages(params: FindMessagesParams): Promise<Message[]>
  findMessagesGroups(params: FindMessagesGroupsParams): Promise<MessagesGroup[]>
  findThread(thread: CardID): Promise<Thread | undefined>

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
