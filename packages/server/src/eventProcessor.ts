import {
  type Message,
  type Patch,
  type Reaction,
  type Attachment,
  type SocialID,
  type WorkspaceID
} from '@hcengineering/communication-types'
import {
  type CreateAttachmentEvent,
  type AttachmentCreatedEvent,
  type CreateMessageEvent,
  type MessageCreatedEvent,
  type CreatePatchEvent,
  type PatchCreatedEvent,
  type CreateReactionEvent,
  type ReactionCreatedEvent,
  type RemoveAttachmentEvent,
  type AttachmentRemovedEvent,
  type RemoveMessageEvent,
  type MessageRemovedEvent,
  type RemoveReactionEvent,
  type ReactionRemovedEvent,
  type EventResult,
  type DbAdapter,
  type CreateNotificationEvent,
  type RemoveNotificationEvent,
  type CreateNotificationContextEvent,
  type RemoveNotificationContextEvent,
  type UpdateNotificationContextEvent,
  type NotificationRemovedEvent,
  type NotificationContextCreatedEvent,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  type ResponseEvent,
  RequestEventType,
  type RequestEvent,
  ResponseEventType,
  type CreateMessagesGroupEvent,
  type RemoveMessagesEvent,
  type MessagesRemovedEvent
} from '@hcengineering/communication-sdk-types'

export type Result = {
  responseEvent?: ResponseEvent
  result: EventResult
}

export type UserInfo = {
  personalWorkspace: WorkspaceID
  socialIds: SocialID[]
}

export class EventProcessor {
  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID
  ) {}

  async process(user: UserInfo, event: RequestEvent): Promise<Result> {
    switch (event.type) {
      case RequestEventType.CreateMessage:
        return await this.createMessage(event, user)
      case RequestEventType.RemoveMessage:
        return await this.removeMessage(event, user)
      case RequestEventType.RemoveMessages:
        return await this.removeMessages(event, user)
      case RequestEventType.CreatePatch:
        return await this.createPatch(event, user)
      case RequestEventType.CreateReaction:
        return await this.createReaction(event, user)
      case RequestEventType.RemoveReaction:
        return await this.removeReaction(event, user)
      case RequestEventType.CreateAttachment:
        return await this.createAttachment(event, user)
      case RequestEventType.RemoveAttachment:
        return await this.removeAttachment(event, user)
      case RequestEventType.CreateNotification:
        return await this.createNotification(event, user)
      case RequestEventType.RemoveNotification:
        return await this.removeNotification(event, user)
      case RequestEventType.CreateNotificationContext:
        return await this.createNotificationContext(event, user)
      case RequestEventType.RemoveNotificationContext:
        return await this.removeNotificationContext(event, user)
      case RequestEventType.UpdateNotificationContext:
        return await this.updateNotificationContext(event, user)
      case RequestEventType.CreateMessagesGroup:
        return await this.createMessagesGroup(event, user)
    }
  }

  private async createMessage(event: CreateMessageEvent, user: UserInfo): Promise<Result> {
    if (!user.socialIds.includes(event.creator)) {
      throw new Error('Forbidden')
    }

    const created = new Date()
    const id = await this.db.createMessage(event.card, event.content, event.creator, created)
    const message: Message = {
      id,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created: created,
      edited: created,
      reactions: [],
      attachments: []
    }
    const responseEvent: MessageCreatedEvent = {
      type: ResponseEventType.MessageCreated,
      message
    }
    return {
      responseEvent,
      result: { id }
    }
  }

  private async createPatch(event: CreatePatchEvent, user: UserInfo): Promise<Result> {
    if (!user.socialIds.includes(event.creator)) {
      throw new Error('Forbidden')
    }
    const created = new Date()
    await this.db.createPatch(event.card, event.message, event.content, event.creator, created)

    const patch: Patch = {
      message: event.message,
      content: event.content,
      creator: event.creator,
      created: created
    }
    const responseEvent: PatchCreatedEvent = {
      type: ResponseEventType.PatchCreated,
      card: event.card,
      patch
    }
    return {
      responseEvent,
      result: {}
    }
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeMessage(event: RemoveMessageEvent, _: UserInfo): Promise<Result> {
    const res = await this.db.removeMessage(event.card, event.message)

    if (res === undefined) {
      return {
        responseEvent: undefined,
        result: { id: res }
      }
    }

    const responseEvent: MessageRemovedEvent = {
      type: ResponseEventType.MessageRemoved,
      card: event.card,
      message: event.message
    }

    return {
      responseEvent,
      result: { id: res }
    }
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeMessages(event: RemoveMessagesEvent, _: UserInfo): Promise<Result> {
    const ids = await this.db.removeMessages(event.card, event.messages)

    if (event.silent === true) {
      return {
        responseEvent: undefined,
        result: { ids }
      }
    }

    const responseEvent: MessagesRemovedEvent = {
      type: ResponseEventType.MessagesRemoved,
      card: event.card,
      messages: ids
    }

    return {
      responseEvent,
      result: { ids }
    }
  }

  private async createReaction(event: CreateReactionEvent, user: UserInfo): Promise<Result> {
    if (!user.socialIds.includes(event.creator)) {
      throw new Error('Forbidden')
    }
    const created = new Date()
    await this.db.createReaction(event.card, event.message, event.reaction, event.creator, created)

    const reaction: Reaction = {
      message: event.message,
      reaction: event.reaction,
      creator: event.creator,
      created: created
    }
    const responseEvent: ReactionCreatedEvent = {
      type: ResponseEventType.ReactionCreated,
      card: event.card,
      reaction
    }
    return {
      responseEvent,
      result: {}
    }
  }

  private async removeReaction(event: RemoveReactionEvent, user: UserInfo): Promise<Result> {
    if (!user.socialIds.includes(event.creator)) {
      throw new Error('Forbidden')
    }
    await this.db.removeReaction(event.card, event.message, event.reaction, event.creator)
    const responseEvent: ReactionRemovedEvent = {
      type: ResponseEventType.ReactionRemoved,
      card: event.card,
      message: event.message,
      reaction: event.reaction,
      creator: event.creator
    }
    return {
      responseEvent,
      result: {}
    }
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createAttachment(event: CreateAttachmentEvent, _: UserInfo): Promise<Result> {
    const created = new Date()
    await this.db.createAttachment(event.message, event.card, event.creator, created)

    const attachment: Attachment = {
      message: event.message,
      card: event.card,
      creator: event.creator,
      created: created
    }
    const responseEvent: AttachmentCreatedEvent = {
      type: ResponseEventType.AttachmentCreated,
      card: event.card,
      attachment
    }

    return {
      responseEvent,
      result: {}
    }
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeAttachment(event: RemoveAttachmentEvent, _: UserInfo): Promise<Result> {
    await this.db.removeAttachment(event.message, event.card)
    const responseEvent: AttachmentRemovedEvent = {
      type: ResponseEventType.AttachmentRemoved,
      card: event.card,
      message: event.message,
      attachment: event.attachment
    }
    return {
      responseEvent,
      result: {}
    }
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createNotification(event: CreateNotificationEvent, _: UserInfo): Promise<Result> {
    await this.db.createNotification(event.message, event.context)

    return {
      result: {}
    }
  }

  private async removeNotification(event: RemoveNotificationEvent, user: UserInfo): Promise<Result> {
    await this.db.removeNotification(event.message, event.context)

    const responseEvent: NotificationRemovedEvent = {
      type: ResponseEventType.NotificationRemoved,
      personalWorkspace: user.personalWorkspace,
      message: event.message,
      context: event.context
    }
    return {
      responseEvent,
      result: {}
    }
  }

  private async createNotificationContext(event: CreateNotificationContextEvent, user: UserInfo): Promise<Result> {
    const id = await this.db.createContext(user.personalWorkspace, event.card, event.lastView, event.lastUpdate)
    const responseEvent: NotificationContextCreatedEvent = {
      type: ResponseEventType.NotificationContextCreated,
      context: {
        id,
        workspace: this.workspace,
        personalWorkspace: user.personalWorkspace,
        card: event.card,
        lastView: event.lastView,
        lastUpdate: event.lastUpdate
      }
    }
    return {
      responseEvent,
      result: { id }
    }
  }

  private async removeNotificationContext(event: RemoveNotificationContextEvent, user: UserInfo): Promise<Result> {
    await this.db.removeContext(event.context)
    const responseEvent: NotificationContextRemovedEvent = {
      type: ResponseEventType.NotificationContextRemoved,
      personalWorkspace: user.personalWorkspace,
      context: event.context
    }
    return {
      responseEvent,
      result: {}
    }
  }

  async updateNotificationContext(event: UpdateNotificationContextEvent, user: UserInfo): Promise<Result> {
    await this.db.updateContext(event.context, event.update)

    const responseEvent: NotificationContextUpdatedEvent = {
      type: ResponseEventType.NotificationContextUpdated,
      personalWorkspace: user.personalWorkspace,
      context: event.context,
      update: event.update
    }
    return {
      responseEvent,
      result: {}
    }
  }

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createMessagesGroup(event: CreateMessagesGroupEvent, _: UserInfo): Promise<Result> {
    const { fromId, toId, fromDate, toDate, count } = event.group
    await this.db.createMessagesGroup(event.group.card, event.group.blobId, fromId, toId, fromDate, toDate, count)

    return {
      responseEvent: undefined,
      result: {}
    }
  }
}
