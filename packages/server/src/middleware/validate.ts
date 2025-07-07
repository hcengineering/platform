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
  MessageEventType,
  NotificationEventType,
  type Event,
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
  SortingOrder
} from '@hcengineering/communication-types'
import { z } from 'zod'

import type { Enriched, Middleware, QueryId } from '../types'
import { BaseMiddleware } from './base'
import { ApiError } from '../error'

export class ValidateMiddleware extends BaseMiddleware implements Middleware {
  private validate<T>(data: unknown, schema: z.ZodType<T>): T {
    const validationResult = schema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message)
      this.context.ctx.error(validationResult.error.message, data as any)
      throw ApiError.badRequest(errors.join(', '))
    }
    return validationResult.data
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

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    if (derived) return await this.provideEvent(session, event, derived)
    switch (event.type) {
      case MessageEventType.CreateMessage:
        this.validate(event, CreateMessageEventSchema)
        break
      case MessageEventType.UpdatePatch:
        this.validate(event, UpdatePatchEventSchema)
        break
      case MessageEventType.RemovePatch:
        this.validate(event, RemovePatchEventSchema)
        break
      case MessageEventType.ReactionPatch:
        this.validate(event, ReactionPatchEventSchema)
        break
      case MessageEventType.BlobPatch:
        this.validate(event, BlobPatchEventSchema)
        break
      case MessageEventType.LinkPreviewPatch:
        this.validate(event, LinkPreviewPatchEventSchema)
        break
      case MessageEventType.ThreadPatch:
        this.validate(event, ThreadPatchEventSchema)
        break
      case MessageEventType.CreateMessagesGroup:
        this.validate(event, CreateMessagesGroupEventSchema)
        break
      case MessageEventType.RemoveMessagesGroup:
        this.validate(event, RemoveMessagesGroupEventSchema)
        break
      case NotificationEventType.AddCollaborators:
        this.validate(event, AddCollaboratorsEventSchema)
        break
      case NotificationEventType.RemoveCollaborators:
        this.validate(event, RemoveCollaboratorsEventSchema)
        break
      case NotificationEventType.UpdateNotification:
        this.validate(event, UpdateNotificationsEventSchema)
        break
      case NotificationEventType.RemoveNotificationContext:
        this.validate(event, RemoveNotificationContextEventSchema)
        break
      case NotificationEventType.UpdateNotificationContext:
        this.validate(event, UpdateNotificationContextEventSchema)
        break
    }
    return await this.provideEvent(session, deserializeEvent(event), derived)
  }
}

const AccountIDSchema = z.string()
const BlobIDSchema = z.string()
const CardIDSchema = z.string()
const CardTypeSchema = z.string()
const ContextIDSchema = z.string()
const DateSchema = z.coerce.date()
const LabelIDSchema = z.string()
const LinkPreviewIDSchema = z.string()
const MarkdownSchema = z.string()
const MessageExtraSchema = z.any()
const MessageIDSchema = z.string()
const MessageTypeSchema = z.string()
const MessagesGroupSchema = z.any()
const SocialIDSchema = z.string()
const SortingOrderSchema = z.union([z.literal(SortingOrder.Ascending), z.literal(SortingOrder.Descending)])

const BlobDataSchema = z.object({
  blobId: BlobIDSchema,
  mimeType: z.string(),
  fileName: z.string(),
  size: z.number(),
  metadata: z.record(z.string(), z.any()).optional()
})

const UpdateBlobDataSchema = z.object({
  blobId: BlobIDSchema,
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  size: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

const LinkPreviewDataSchema = z
  .object({
    previewId: LinkPreviewIDSchema,
    url: z.string(),
    host: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    siteName: z.string().optional(),
    iconUrl: z.string().optional(),
    previewImage: z
      .object({
        url: z.string(),
        width: z.number().optional(),
        height: z.number().optional()
      })
      .optional()
  })
  .strict()

// Find params
const DateOrRecordSchema = z.union([DateSchema, z.record(DateSchema)])

const FindParamsSchema = z
  .object({
    order: SortingOrderSchema.optional(),
    limit: z.number().optional()
  })
  .strict()

const FindMessagesParamsSchema = FindParamsSchema.extend({
  id: MessageIDSchema.optional(),
  card: CardIDSchema.optional(),
  files: z.boolean().optional(),
  reactions: z.boolean().optional(),
  replies: z.boolean().optional(),
  links: z.boolean().optional(),
  created: DateOrRecordSchema.optional()
}).strict()

const FindMessagesGroupsParamsSchema = FindParamsSchema.extend({
  messageId: MessageIDSchema.optional(),
  card: CardIDSchema.optional(),
  blobId: BlobIDSchema.optional(),
  patches: z.boolean().optional(),
  fromDate: DateOrRecordSchema.optional(),
  toDate: DateOrRecordSchema.optional(),
  orderBy: z.enum(['fromDate', 'toDate']).optional()
}).strict()

const FindNotificationContextParamsSchema = FindParamsSchema.extend({
  id: ContextIDSchema.optional(),
  card: z.union([CardIDSchema, z.array(CardIDSchema)]).optional(),
  lastNotify: DateOrRecordSchema.optional(),
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
  created: DateOrRecordSchema.optional(),
  account: z.union([AccountIDSchema, z.array(AccountIDSchema)]).optional(),
  message: z.boolean().optional(),
  card: CardIDSchema.optional()
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

const BaseEventSchema = z
  .object({
    _id: z.string().optional()
  })
  .strict()

// Message events
const CreateMessageEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.CreateMessage),

  cardId: CardIDSchema,
  cardType: CardTypeSchema,

  messageId: MessageIDSchema.max(22).optional(),
  messageType: MessageTypeSchema,

  content: MarkdownSchema,
  extra: MessageExtraSchema.optional(),

  socialId: SocialIDSchema,
  date: DateSchema,

  options: z
    .object({
      skipLinkPreviews: z.boolean().optional(),
      noNotify: z.boolean().optional()
    })
    .optional()
}).strict()

const UpdatePatchEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.UpdatePatch),
  cardId: CardIDSchema,
  messageId: MessageIDSchema.optional(),

  content: MarkdownSchema.optional(),
  extra: z.record(z.any()).optional(),

  socialId: SocialIDSchema,
  date: DateSchema,

  options: z
    .object({
      skipLinkPreviewsUpdate: z.boolean().optional()
    })
    .optional()
}).strict()

const RemovePatchEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.RemovePatch),
  cardId: CardIDSchema,
  messageId: MessageIDSchema.optional(),

  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const ReactionOperationSchema = z.union([
  z.object({ opcode: z.literal('add'), reaction: z.string() }),
  z.object({ opcode: z.literal('remove'), reaction: z.string() })
])

const ReactionPatchEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.ReactionPatch),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,
  operation: ReactionOperationSchema,
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const BlobOperationSchema = z.union([
  z.object({ opcode: z.literal('attach'), blobs: z.array(BlobDataSchema).nonempty() }),
  z.object({ opcode: z.literal('detach'), blobIds: z.array(BlobIDSchema).nonempty() }),
  z.object({ opcode: z.literal('set'), blobs: z.array(BlobDataSchema).nonempty() }),
  z.object({ opcode: z.literal('update'), blobs: z.array(UpdateBlobDataSchema).nonempty() })
])

const BlobPatchEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.BlobPatch),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,
  operations: z.array(BlobOperationSchema).nonempty(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const ThreadPatchEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.ThreadPatch),
  cardId: CardIDSchema,
  messageId: MessageIDSchema,
  operation: z.object({ opcode: z.literal('attach'), threadId: CardIDSchema, threadType: CardTypeSchema }),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const LinkPreviewOperationSchema = z.union([
  z.object({ opcode: z.literal('attach'), previews: z.array(LinkPreviewDataSchema).nonempty() }),
  z.object({ opcode: z.literal('detach'), previewIds: z.array(LinkPreviewIDSchema).nonempty() }),
  z.object({ opcode: z.literal('set'), previews: z.array(LinkPreviewDataSchema).nonempty() })
])

const LinkPreviewPatchEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.LinkPreviewPatch),
  cardId: CardIDSchema,
  messageId: MessageIDSchema.optional(),
  operations: z.array(LinkPreviewOperationSchema).nonempty(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const CreateMessagesGroupEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.CreateMessagesGroup),
  group: MessagesGroupSchema,
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveMessagesGroupEventSchema = BaseEventSchema.extend({
  type: z.literal(MessageEventType.RemoveMessagesGroup),
  cardId: CardIDSchema,
  blobId: BlobIDSchema,
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

// Notification events
const UpdateNotificationsEventSchema = BaseEventSchema.extend({
  type: z.literal(NotificationEventType.UpdateNotification),
  contextId: ContextIDSchema,
  account: AccountIDSchema,
  query: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    untilDate: DateSchema.optional()
  }),
  updates: z.object({
    read: z.boolean()
  }),
  date: DateSchema
}).strict()

const RemoveNotificationContextEventSchema = BaseEventSchema.extend({
  type: z.literal(NotificationEventType.RemoveNotificationContext),
  contextId: ContextIDSchema,
  account: AccountIDSchema,
  date: DateSchema
}).strict()

const UpdateNotificationContextEventSchema = BaseEventSchema.extend({
  type: z.literal(NotificationEventType.UpdateNotificationContext),
  contextId: ContextIDSchema,
  account: AccountIDSchema,
  updates: z.object({
    lastView: DateSchema.optional()
  }),
  date: DateSchema
}).strict()

const AddCollaboratorsEventSchema = BaseEventSchema.extend({
  type: z.literal(NotificationEventType.AddCollaborators),
  cardId: CardIDSchema,
  cardType: CardTypeSchema,
  collaborators: z.array(AccountIDSchema).nonempty(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

const RemoveCollaboratorsEventSchema = BaseEventSchema.extend({
  type: z.literal(NotificationEventType.RemoveCollaborators),
  cardId: CardIDSchema,
  cardType: CardTypeSchema,
  collaborators: z.array(AccountIDSchema).nonempty(),
  socialId: SocialIDSchema,
  date: DateSchema
}).strict()

function deserializeEvent (event: Enriched<Event>): Enriched<Event> {
  switch (event.type) {
    case MessageEventType.CreateMessagesGroup:
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event.group.fromDate = deserializeDate(event.group.fromDate)!
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event.group.toDate = deserializeDate(event.group.toDate)!
      break
    case NotificationEventType.UpdateNotificationContext:
      event.updates.lastView = deserializeDate(event.updates.lastView)
      break
    case NotificationEventType.UpdateNotification:
      event.query.untilDate = deserializeDate(event.query.untilDate)
      break
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  event.date = deserializeDate(event.date)!
  return event
}

function deserializeDate (date?: Date | string | undefined | null): Date | undefined {
  if (date == null) return undefined
  if (date instanceof Date) return date
  return new Date(date)
}
