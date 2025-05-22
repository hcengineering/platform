//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import {
  LabelRequestEventType,
  MessageRequestEventType,
  type EventResult,
  type RequestEvent,
  type SessionData,
  NotificationRequestEventType
} from '@hcengineering/communication-sdk-types'
import {
  type Collaborator,
  type FindCollaboratorsParams,
  type FindLabelsParams,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Label,
  type Message,
  type MessagesGroup,
  type Notification,
  type NotificationContext,
  PatchType
} from '@hcengineering/communication-types'
import { z } from 'zod'

import type { Middleware, MiddlewareContext, QueryId } from '../types'
import { BaseMiddleware } from './base'
import { ApiError } from '../error'

export class ValidateMiddleware extends BaseMiddleware implements Middleware {
  constructor(context: MiddlewareContext, next?: Middleware) {
    super(context, next)
  }

  private validate(data: any, schema: z.ZodObject<any>): void {
    const validationResult = schema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message)
      this.context.ctx.error(validationResult.error.message, data)
      throw ApiError.badRequest(errors.join(', '))
    }
  }

  async findMessages(session: SessionData, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    this.validate(params, FindMessagesParamsSchema)
    return await this.provideFindMessages(session, params, queryId)
  }

  async findMessagesGroups(
    session: SessionData,
    params: FindMessagesGroupsParams,
    queryId?: QueryId
  ): Promise<MessagesGroup[]> {
    this.validate(params, FindMessagesGroupsParamsSchema)
    return await this.provideFindMessagesGroups(session, params, queryId)
  }

  async findNotificationContexts(
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    this.validate(params, FindNotificationContextParamsSchema)
    return await this.provideFindNotificationContexts(session, params, queryId)
  }

  async findNotifications(
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    this.validate(params, FindNotificationsParamsSchema)
    return await this.provideFindNotifications(session, params, queryId)
  }

  async findLabels(session: SessionData, params: FindLabelsParams, queryId?: QueryId): Promise<Label[]> {
    this.validate(params, FindLabelsParamsSchema)
    return await this.provideFindLabels(session, params, queryId)
  }

  async findCollaborators(session: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    this.validate(params, FindCollaboratorsParamsSchema)
    return await this.provideFindCollaborators(session, params)
  }

  async event(session: SessionData, event: RequestEvent, derived: boolean): Promise<EventResult> {
    if (derived) return await this.provideEvent(session, event, derived)
    switch (event.type) {
      case MessageRequestEventType.CreateMessage:
        this.validate(event, CreateMessageEventSchema)
        break
      case MessageRequestEventType.CreatePatch:
        this.validate(event, CreatePatchEventSchema)
        break
      case MessageRequestEventType.CreateReaction:
        this.validate(event, CreateReactionEventSchema)
        break
      case MessageRequestEventType.RemoveReaction:
        this.validate(event, RemoveReactionEventSchema)
        break
      case MessageRequestEventType.CreateFile:
        this.validate(event, CreateFileEventSchema)
        break
      case MessageRequestEventType.RemoveFile:
        this.validate(event, RemoveFileEventSchema)
        break
      case MessageRequestEventType.CreateThread:
        this.validate(event, CreateThreadEventSchema)
        break
      case MessageRequestEventType.UpdateThread:
        this.validate(event, UpdateThreadEventSchema)
        break
      case MessageRequestEventType.CreateMessagesGroup:
        this.validate(event, CreateMessagesGroupEventSchema)
        break
      case MessageRequestEventType.RemoveMessagesGroup:
        this.validate(event, RemoveMessagesGroupEventSchema)
        break
      case LabelRequestEventType.CreateLabel:
        this.validate(event, CreateLabelEventSchema)
        break
      case LabelRequestEventType.RemoveLabel:
        this.validate(event, RemoveLabelEventSchema)
        break
      case NotificationRequestEventType.AddCollaborators:
        this.validate(event, AddCollaboratorsEventSchema)
        break
      case NotificationRequestEventType.RemoveCollaborators:
        this.validate(event, RemoveCollaboratorsEventSchema)
        break
      case NotificationRequestEventType.CreateNotification:
        this.validate(event, CreateNotificationEventSchema)
        break
      case NotificationRequestEventType.RemoveNotifications:
        this.validate(event, RemoveNotificationsEventSchema)
        break
      case NotificationRequestEventType.UpdateNotification:
        this.validate(event, UpdateNotificationsEventSchema)
        break
      case NotificationRequestEventType.CreateNotificationContext:
        this.validate(event, CreateNotificationContextEventSchema)
        break
      case NotificationRequestEventType.RemoveNotificationContext:
        this.validate(event, RemoveNotificationContextEventSchema)
        break
      case NotificationRequestEventType.UpdateNotificationContext:
        this.validate(event, UpdateNotificationContextEventSchema)
        break
    }
    return await this.provideEvent(session, deserializeEvent(event), derived)
  }
}

const AccountID = z.string()
const BlobID = z.string()
const CardID = z.string()
const CardType = z.string()
const ContextID = z.string()
const LabelID = z.string()
const MessageData = z.any()
const PatchData = z.any()
const MessageID = z.string()
const NotificationID = z.string()
const MessageType = z.string()
const MessagesGroup = z.any()
const PatchTypeSchema = z.enum([PatchType.update, PatchType.remove])
const RichText = z.string()
const SocialID = z.string()
const SortingOrder = z.number()
const DateSchema = z.union([z.date(), z.string()])

// Find params
const dateOrRecordSchema = z.union([DateSchema, z.record(DateSchema)])

const FindParamsSchema = z
  .object({
    order: SortingOrder.optional(),
    limit: z.number().optional()
  })
  .strict()

const FindMessagesParamsSchema = FindParamsSchema.extend({
  id: MessageID.optional(),
  externalId: z.string().optional(),
  card: CardID,
  files: z.boolean().optional(),
  reactions: z.boolean().optional(),
  replies: z.boolean().optional(),
  created: dateOrRecordSchema.optional()
}).strict()

const FindMessagesGroupsParamsSchema = FindParamsSchema.extend({
  card: CardID,
  blobId: BlobID.optional(),
  patches: z.boolean().optional(),
  fromDate: dateOrRecordSchema.optional(),
  toDate: dateOrRecordSchema.optional(),
  orderBy: z.enum(['fromDate', 'toDate']).optional()
}).strict()

const FindNotificationContextParamsSchema = FindParamsSchema.extend({
  id: ContextID.optional(),
  card: z.union([CardID, z.array(CardID)]).optional(),
  lastUpdate: dateOrRecordSchema.optional(),
  account: z.union([AccountID, z.array(AccountID)]).optional(),
  notifications: z
    .object({
      type: z.string().optional(),
      message: z.boolean().optional(),
      limit: z.number(),
      order: SortingOrder,
      read: z.boolean().optional()
    })
    .optional()
}).strict()

const FindNotificationsParamsSchema = FindParamsSchema.extend({
  context: ContextID.optional(),
  type: z.string().optional(),
  read: z.boolean().optional(),
  created: dateOrRecordSchema.optional(),
  account: z.union([AccountID, z.array(AccountID)]).optional(),
  message: z.boolean().optional()
}).strict()

const FindLabelsParamsSchema = FindParamsSchema.extend({
  label: z.union([LabelID, z.array(LabelID)]).optional(),
  card: CardID.optional(),
  cardType: z.union([CardType, z.array(CardType)]).optional(),
  account: AccountID.optional()
}).strict()

const FindCollaboratorsParamsSchema = FindParamsSchema.extend({
  card: CardID.optional(),
  account: z.union([AccountID, z.array(AccountID)]).optional()
}).strict()
//Events

const BaseRequestEventSchema = z
  .object({
    _id: z.string().optional()
  })
  .strict()

//Label events
const CreateLabelEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(LabelRequestEventType.CreateLabel),
  label: LabelID,
  card: CardID,
  cardType: CardType,
  account: AccountID
}).strict()

const RemoveLabelEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(LabelRequestEventType.RemoveLabel),
  label: LabelID,
  card: CardID,
  account: AccountID
}).strict()

// Message events
const CreateMessageEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateMessage),
  messageType: MessageType,
  card: CardID,
  cardType: CardType,
  content: RichText,
  creator: SocialID,
  data: MessageData.optional(),
  externalId: z.string().optional(),
  created: DateSchema.optional(),
  id: MessageID.optional()
}).strict()

const CreatePatchEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreatePatch),
  patchType: PatchTypeSchema,
  card: CardID,
  message: MessageID,
  messageCreated: DateSchema,
  data: PatchData,
  creator: SocialID,
  created: DateSchema.optional()
}).strict()

const CreateReactionEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateReaction),
  card: CardID,
  message: MessageID,
  messageCreated: DateSchema,
  reaction: z.string(),
  creator: SocialID
}).strict()

const RemoveReactionEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.RemoveReaction),
  card: CardID,
  message: MessageID,
  messageCreated: DateSchema,
  reaction: z.string(),
  creator: SocialID
}).strict()

const CreateFileEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateFile),
  card: CardID,
  message: MessageID,
  messageCreated: DateSchema,
  blobId: BlobID,
  size: z.number(),
  fileType: z.string(),
  filename: z.string(),
  creator: SocialID,
  meta: z.record(z.string(), z.any()).optional()
}).strict()

const RemoveFileEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.RemoveFile),
  card: CardID,
  message: MessageID,
  messageCreated: DateSchema,
  creator: SocialID,
  blobId: BlobID
}).strict()

const CreateThreadEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateThread),
  card: CardID,
  message: MessageID,
  messageCreated: DateSchema,
  thread: CardID,
  threadType: CardType
}).strict()

const UpdateThreadEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.UpdateThread),
  thread: CardID,
  updates: z.object({
    replies: z.enum(['increment', 'decrement']),
    lastReply: DateSchema.optional()
  })
}).strict()

const CreateMessagesGroupEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateMessagesGroup),
  group: MessagesGroup
}).strict()

const RemoveMessagesGroupEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.RemoveMessagesGroup),
  card: CardID,
  blobId: BlobID
}).strict()

// Notification events

const CreateNotificationEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.CreateNotification),
  notificationType: z.string(),
  content: z.record(z.any()).optional(),
  read: z.boolean().optional(),
  context: ContextID,
  message: MessageID,
  messageCreated: DateSchema,
  created: DateSchema,
  account: AccountID
}).strict()

const UpdateNotificationsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.UpdateNotification),
  query: z.object({
    context: ContextID,
    account: AccountID,
    id: z.string().optional(),
    type: z.string().optional(),
    read: z.boolean().optional(),
    created: dateOrRecordSchema.optional()
  }),
  updates: z.object({
    read: z.boolean()
  })
}).strict()

const RemoveNotificationsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.RemoveNotifications),
  context: ContextID,
  account: AccountID,
  ids: z.array(NotificationID).nonempty()
}).strict()

const CreateNotificationContextEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.CreateNotificationContext),
  card: CardID,
  account: AccountID,
  lastView: DateSchema,
  lastUpdate: DateSchema,
  lastNotify: DateSchema.optional()
}).strict()

const RemoveNotificationContextEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.RemoveNotificationContext),
  context: ContextID,
  account: AccountID
}).strict()

const UpdateNotificationContextEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.UpdateNotificationContext),
  context: ContextID,
  account: AccountID,
  updates: z.object({
    lastView: DateSchema.optional(),
    lastUpdate: DateSchema.optional(),
    lastNotify: DateSchema.optional()
  })
}).strict()

const AddCollaboratorsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.AddCollaborators),
  card: CardID,
  cardType: CardType,
  collaborators: z.array(AccountID).nonempty(),
  date: DateSchema.optional()
}).strict()

const RemoveCollaboratorsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.RemoveCollaborators),
  card: CardID,
  collaborators: z.array(AccountID)
}).strict()

function deserializeEvent(event: RequestEvent): RequestEvent {
  switch (event.type) {
    case MessageRequestEventType.CreateMessage:
      return {
        ...event,
        created: deserializeDate(event.created)
      }
    case MessageRequestEventType.CreateThread:
    case MessageRequestEventType.RemoveFile:
    case MessageRequestEventType.CreateFile:
    case MessageRequestEventType.RemoveReaction:
    case MessageRequestEventType.CreateReaction:
    case MessageRequestEventType.CreatePatch:
      return {
        ...event,
        messageCreated: deserializeDate(event.messageCreated)!
      }
    case MessageRequestEventType.UpdateThread:
      return {
        ...event,
        updates: {
          ...event.updates,
          lastReply: deserializeDate(event.updates.lastReply)
        }
      }
    case MessageRequestEventType.CreateMessagesGroup:
      return {
        ...event,
        group: {
          ...event.group,
          fromDate: deserializeDate(event.group.fromDate)!,
          toDate: deserializeDate(event.group.toDate)!
        }
      }
    case NotificationRequestEventType.AddCollaborators:
      return {
        ...event,
        date: deserializeDate(event.date)
      }
    case NotificationRequestEventType.CreateNotification:
      return {
        ...event,
        created: deserializeDate(event.created)!
      }
    case NotificationRequestEventType.CreateNotificationContext:
      return {
        ...event,
        lastView: deserializeDate(event.lastView)!,
        lastUpdate: deserializeDate(event.lastUpdate)!
      }
    case NotificationRequestEventType.UpdateNotificationContext:
      return {
        ...event,
        updates: {
          ...event.updates,
          lastView: deserializeDate(event.updates.lastView)!,
          lastUpdate: deserializeDate(event.updates.lastUpdate)!
        }
      }
  }

  return event
}

function deserializeDate(date?: Date | string | undefined | null): Date | undefined {
  if (date == null) return undefined
  if (date instanceof Date) return date
  return new Date(date)
}
