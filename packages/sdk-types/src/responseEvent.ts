import type {
  Attachment,
  CardID,
  ContextID,
  Message,
  MessageID,
  NotificationContext,
  NotificationContextUpdate,
  Patch,
  Reaction,
  SocialID,
  Notification,
  Thread
} from '@hcengineering/communication-types'

export enum ResponseEventType {
  MessageCreated = 'messageCreated',
  MessageRemoved = 'messageRemoved',
  PatchCreated = 'patchCreated',
  ReactionCreated = 'reactionCreated',
  ReactionRemoved = 'reactionRemoved',
  AttachmentCreated = 'attachmentCreated',
  AttachmentRemoved = 'attachmentRemoved',
  ThreadCreated = 'threadCreated',
  NotificationCreated = 'notificationCreated',
  NotificationRemoved = 'notificationRemoved',
  NotificationContextCreated = 'notificationContextCreated',
  NotificationContextRemoved = 'notificationContextRemoved',
  NotificationContextUpdated = 'notificationContextUpdated'
}

export type ResponseEvent =
  | MessageCreatedEvent
  | MessageRemovedEvent
  | PatchCreatedEvent
  | ReactionCreatedEvent
  | ReactionRemovedEvent
  | AttachmentCreatedEvent
  | AttachmentRemovedEvent
  | NotificationCreatedEvent
  | NotificationRemovedEvent
  | NotificationContextCreatedEvent
  | NotificationContextRemovedEvent
  | NotificationContextUpdatedEvent
  | ThreadCreatedEvent

export interface MessageCreatedEvent {
  type: ResponseEventType.MessageCreated
  message: Message
}

export interface MessageRemovedEvent {
  type: ResponseEventType.MessageRemoved
  card: CardID
  message: MessageID
}

export interface PatchCreatedEvent {
  type: ResponseEventType.PatchCreated
  card: CardID
  patch: Patch
}

export interface ReactionCreatedEvent {
  type: ResponseEventType.ReactionCreated
  card: CardID
  reaction: Reaction
}

export interface ReactionRemovedEvent {
  type: ResponseEventType.ReactionRemoved
  card: CardID
  message: MessageID
  reaction: string
  creator: SocialID
}

export interface AttachmentCreatedEvent {
  type: ResponseEventType.AttachmentCreated
  card: CardID
  attachment: Attachment
}

export interface AttachmentRemovedEvent {
  type: ResponseEventType.AttachmentRemoved
  card: CardID
  message: MessageID
  attachment: CardID
}

export interface ThreadCreatedEvent {
  type: ResponseEventType.ThreadCreated
  thread: Thread
}

export interface NotificationCreatedEvent {
  type: ResponseEventType.NotificationCreated
  personalWorkspace: string
  notification: Notification
}

export interface NotificationRemovedEvent {
  type: ResponseEventType.NotificationRemoved
  personalWorkspace: string
  message: MessageID
  context: ContextID
}

export interface NotificationContextCreatedEvent {
  type: ResponseEventType.NotificationContextCreated
  context: NotificationContext
}

export interface NotificationContextRemovedEvent {
  type: ResponseEventType.NotificationContextRemoved
  personalWorkspace: string
  context: ContextID
}

export interface NotificationContextUpdatedEvent {
  type: ResponseEventType.NotificationContextUpdated
  personalWorkspace: string
  context: ContextID
  update: NotificationContextUpdate
}
