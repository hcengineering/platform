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
  type EventResult,
  MessageRequestEventType,
  NotificationRequestEventType,
  type RequestEvent,
  type SessionData
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
  PatchType,
  SortingOrder
} from '@hcengineering/communication-types'
import { z } from 'zod'

import type { Enriched, Middleware, QueryId } from '../types'
import { BaseMiddleware } from './base'
import { ApiError } from '../error'

export class ValidateMiddleware extends BaseMiddleware implements Middleware {
  private validate (data: any, schema: z.ZodObject<any>): void {
    const validationResult = schema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message)
      this.context.ctx.error(validationResult.error.message, data)
      throw ApiError.badRequest(errors.join(', '))
    }
  }

  async findMessages (session: SessionData, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    this.validate(params, FindMessagesParamsSchema)
    return await this.provideFindMessages(session, params, queryId)
  }

  async findMessagesGroups (
    session: SessionData,
    params: FindMessagesGroupsParams,
    queryId?: QueryId
  ): Promise<MessagesGroup[]> {
    this.validate(params, FindMessagesGroupsParamsSchema)
    return await this.provideFindMessagesGroups(session, params, queryId)
  }

  async findNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    this.validate(params, FindNotificationContextParamsSchema)
    return await this.provideFindNotificationContexts(session, params, queryId)
  }

  async findNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    this.validate(params, FindNotificationsParamsSchema)
    return await this.provideFindNotifications(session, params, queryId)
  }

  async findLabels (session: SessionData, params: FindLabelsParams, queryId?: QueryId): Promise<Label[]> {
    this.validate(params, FindLabelsParamsSchema)
    return await this.provideFindLabels(session, params, queryId)
  }

  async findCollaborators (session: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    this.validate(params, FindCollaboratorsParamsSchema)
    return await this.provideFindCollaborators(session, params)
  }

  async event (session: SessionData, event: Enriched<RequestEvent>, derived: boolean): Promise<EventResult> {
    if (derived) return await this.provideEvent(session, event, derived)
    switch (event.type) {
      case MessageRequestEventType.CreateMessage:
        this.validate(event, CreateMessageEventSchema)
        break
      case MessageRequestEventType.CreatePatch:
        this.validate(event, CreatePatchEventSchema)
        break
      case MessageRequestEventType.SetReaction:
        this.validate(event, SetReactionEventSchema)
        break
      case MessageRequestEventType.RemoveReaction:
        this.validate(event, RemoveReactionEventSchema)
        break
      case MessageRequestEventType.AttachBlob:
        this.validate(event, AttachBlobEventSchema)
        break
      case MessageRequestEventType.DetachBlob:
        this.validate(event, DetachBlobEventSchema)
        break
      case MessageRequestEventType.AttachThread:
        this.validate(event, AttachThreadEventSchema)
        break
      case MessageRequestEventType.CreateLinkPreview:
        this.validate(event, CreateLinkPreviewEventSchema)
        break
      case MessageRequestEventType.RemoveLinkPreview:
        this.validate(event, RemoveLinkPreviewEventSchema)
        break
      case MessageRequestEventType.CreateMessagesGroup:
        this.validate(event, CreateMessagesGroupEventSchema)
        break
      case MessageRequestEventType.RemoveMessagesGroup:
        this.validate(event, RemoveMessagesGroupEventSchema)
        break
      case NotificationRequestEventType.AddCollaborators:
        this.validate(event, AddCollaboratorsEventSchema)
        break
      case NotificationRequestEventType.RemoveCollaborators:
        this.validate(event, RemoveCollaboratorsEventSchema)
        break
      case NotificationRequestEventType.UpdateNotification:
        this.validate(event, UpdateNotificationsEventSchema)
        break
      case NotificationRequestEventType.RemoveNotificationContext:
        this.validate(event, RemoveNotificationContextEventSchema)
        break
      case NotificationRequestEventType.UpdateNotificationContext:
        this.validate(event, UpdateNotificationContextEventSchema)
        break
      default:
        throw new Error('Unknown event type: ' + event.type)
    }
    return await this.provideEvent(session, deserializeEvent(event), derived)
  }
}

const AccountIDSchema = z.string()
const BlobIDSchema = z.string()
const CardIDSchema = z.string()
const CardTypeSchema = z.string()
const ContextIDSchema = z.string()
const DateSchema = z.union([z.date(), z.string()])
const LabelIDSchema = z.string()
const LinkPreviewIDSchema = z.string()
const MarkdownSchema = z.string()
const MessageExtraSchema = z.any()
const MessageIDSchema = z.string()
const MessageTypeSchema = z.string()
const MessagesGroupSchema = z.any()
const SocialIDSchema = z.string()
const SortingOrderSchema = z.union([z.literal(SortingOrder.Ascending), z.literal(SortingOrder.Descending)])

// Find params
const dateOrRecordSchema = z.union([DateSchema, z.record(DateSchema)])

const FindParamsSchema = z
  .object({
    order: SortingOrderSchema.optional(),
    limit: z.number().optional()
  })
  .strict()

const FindMessagesParamsSchema = FindParamsSchema.extend({
  id: MessageIDSchema.optional(),
  card: CardIDSchema,
  files: z.boolean().optional(),
  reactions: z.boolean().optional(),
  replies: z.boolean().optional(),
  links: z.boolean().optional(),
  created: dateOrRecordSchema.optional()
}).strict()

const FindMessagesGroupsParamsSchema = FindParamsSchema.extend({
  card: CardIDSchema,
  blobId: BlobIDSchema.optional(),
  patches: z.boolean().optional(),
  fromDate: dateOrRecordSchema.optional(),
  toDate: dateOrRecordSchema.optional(),
  orderBy: z.enum(['fromDate', 'toDate']).optional()
}).strict()

const FindNotificationContextParamsSchema = FindParamsSchema.extend({
  id: ContextIDSchema.optional(),
  card: z.union([CardIDSchema, z.array(CardIDSchema)]).optional(),
  lastUpdate: dateOrRecordSchema.optional(),
  account: z.union([AccountIDSchema, z.array(AccountIDSchema)]).optional(),
  notifications: z
    .object({
      type: z.string().optional(),
      message: z.boolean().optional(),
      limit: z.number(),
      order: SortingOrderSchema,
      read: z.boolean().optional()
    })
    .optional()
}).strict()

const FindNotificationsParamsSchema = FindParamsSchema.extend({
  context: ContextIDSchema.optional(),
  type: z.string().optional(),
  read: z.boolean().optional(),
  created: dateOrRecordSchema.optional(),
  account: z.union([AccountIDSchema, z.array(AccountIDSchema)]).optional(),
  message: z.boolean().optional()
}).strict()

const FindLabelsParamsSchema = FindParamsSchema.extend({
  label: z.union([LabelIDSchema, z.array(LabelIDSchema)]).optional(),
  card: CardIDSchema.optional(),
  cardType: z.union([CardTypeSchema, z.array(CardTypeSchema)]).optional(),
  account: AccountIDSchema.optional()
}).strict()

const FindCollaboratorsParamsSchema = FindParamsSchema.extend({
  card: CardIDSchema.optional(),
  account: z.union([AccountIDSchema, z.array(AccountIDSchema)]).optional()
}).strict()

// Events

const BaseRequestEventSchema = z
  .object({
    _id: z.string().optional()
  })
  .strict()

// Message events
const CreateMessageEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateMessage),

  cardId: CardIDSchema,
  cardType: CardTypeSchema,

  messageId: MessageIDSchema.optional(),
  messageType: MessageTypeSchema,

  content: MarkdownSchema,
  extra: MessageExtraSchema.optional(),

  socialId: SocialIDSchema,
  date: DateSchema,

  options: z
    .object({
      skipLinkPreviews: z.boolean().optional(),
      ignoreDuplicateIds: z.boolean().optional(),
      noNotify: z.boolean().optional()
    })
    .optional()
}).strict()

const CreatePatchEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreatePatch),

  cardId: CardIDSchema,
  messageId: MessageIDSchema,

  patchType: z.enum([PatchType.update, PatchType.remove]),
  data: z.any(),

  socialId: SocialIDSchema,
  date: DateSchema,

  options: z
    .object({
      skipLinkPreviewsUpdate: z.boolean().optional(),
      markAsUpdated: z.boolean().optional()
    })
    .optional()
}).strict()

const SetReactionEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.SetReaction),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,
  reaction: z.string(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveReactionEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.RemoveReaction),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,
  reaction: z.string(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const AttachThreadEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.AttachThread),

  cardId: CardIDSchema,
  messageId: MessageIDSchema,

  threadId: CardIDSchema,
  threadType: CardTypeSchema,

  socialId: SocialIDSchema,
  date: DateSchema
})

const AttachBlobEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.AttachBlob),

  cardId: CardIDSchema,
  messageId: MessageIDSchema,

  blobData: z.object({
    blobId: BlobIDSchema,
    contentType: z.string(),
    fileName: z.string(),
    size: z.number(),
    metadata: z.record(z.string(), z.any()).optional()
  }),

  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const DetachBlobEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.DetachBlob),

  cardId: CardIDSchema,
  messageId: MessageIDSchema,

  blobId: BlobIDSchema,

  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const CreateLinkPreviewEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateLinkPreview),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,

  preview: z.object({
    url: z.string(),
    host: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    previewImage: z.object({
      url: z.string(),
      width: z.number().optional(),
      height: z.number().optional()
    })
  }),

  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveLinkPreviewEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.RemoveLinkPreview),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,

  previewId: LinkPreviewIDSchema,

  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const CreateMessagesGroupEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.CreateMessagesGroup),
  group: MessagesGroupSchema,
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveMessagesGroupEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(MessageRequestEventType.RemoveMessagesGroup),
  cardId: CardIDSchema,
  blobId: BlobIDSchema,
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

// Notification events
const UpdateNotificationsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.UpdateNotification),
  query: z.object({
    context: ContextIDSchema,
    account: AccountIDSchema,
    id: z.string().optional(),
    type: z.string().optional(),
    read: z.boolean().optional(),
    created: dateOrRecordSchema.optional()
  }),
  updates: z.object({
    read: z.boolean()
  }),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveNotificationContextEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.RemoveNotificationContext),
  contextId: ContextIDSchema,
  account: AccountIDSchema,
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const UpdateNotificationContextEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.UpdateNotificationContext),
  contextId: ContextIDSchema,
  account: AccountIDSchema,
  updates: z.object({
    lastView: DateSchema.optional()
  }),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const AddCollaboratorsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.AddCollaborators),
  cardId: CardIDSchema,
  cardType: CardTypeSchema,
  collaborators: z.array(AccountIDSchema).nonempty(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveCollaboratorsEventSchema = BaseRequestEventSchema.extend({
  type: z.literal(NotificationRequestEventType.RemoveCollaborators),
  cardId: CardIDSchema,
  cardType: CardTypeSchema,
  collaborators: z.array(AccountIDSchema).nonempty(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

function deserializeEvent (event: Enriched<RequestEvent>): Enriched<RequestEvent> {
  switch (event.type) {
    case MessageRequestEventType.CreateMessagesGroup:
      return {
        ...event,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        date: deserializeDate(event.date)!,
        group: {
          ...event.group,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          fromDate: deserializeDate(event.group.fromDate)!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          toDate: deserializeDate(event.group.toDate)!
        }
      }
    case NotificationRequestEventType.UpdateNotificationContext:
      return {
        ...event,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        date: deserializeDate(event.date)!,
        updates: {
          ...event.updates,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lastView: deserializeDate(event.updates.lastView)!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lastUpdate: deserializeDate(event.updates.lastUpdate)!
        }
      }
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { ...event, date: deserializeDate(event.date)! }
}

function deserializeDate (date?: Date | string | undefined | null): Date | undefined {
  if (date == null) return undefined
  if (date instanceof Date) return date
  return new Date(date)
}
