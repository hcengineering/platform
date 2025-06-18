//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
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
  type CreateNotificationContextResult,
  LabelRequestEventType,
  MessageResponseEventType,
  NotificationRequestEventType,
  type RequestEvent,
  type ResponseEvent
} from '@hcengineering/communication-sdk-types'
import {
  type AccountID,
  type CardID,
  type CardType,
  type ContextID,
  type Message,
  type MessageID,
  NewMessageLabelID,
  type NotificationContext,
  NotificationType,
  type Reaction,
  type ReactionNotificationContent,
  type SocialID,
  SortingOrder
} from '@hcengineering/communication-types'

import type { TriggerCtx } from '../types'
import { findAccount } from '../utils'
import { findMessage } from '../triggers/utils'

const BATCH_SIZE = 500

export async function notify (ctx: TriggerCtx, event: ResponseEvent): Promise<RequestEvent[]> {
  switch (event.type) {
    case MessageResponseEventType.MessageCreated: {
      if (event.options?.noNotify === true) return []
      return await notifyMessage(ctx, event.message, event.cardType)
    }
    case MessageResponseEventType.ReactionSet: {
      return await notifyReaction(ctx, event.cardId, event.messageId, event.reaction)
    }
    case MessageResponseEventType.ReactionRemoved: {
      return await removeReactionNotification(ctx, event.cardId, event.messageId, event.reaction, event.socialId)
    }
  }

  return []
}

async function removeReactionNotification (
  ctx: TriggerCtx,
  cardId: CardID,
  messageId: MessageID,
  reaction: string,
  socialId: SocialID
): Promise<RequestEvent[]> {
  const result: RequestEvent[] = []
  const msg = await findMessage(ctx.db, ctx.metadata.filesUrl, ctx.workspace, cardId, messageId)
  if (msg === undefined) return result

  const messageAccount = await findAccount(ctx, msg.creator)
  if (messageAccount == null) return result

  const notifications = await ctx.db.findNotifications({
    type: NotificationType.Reaction,
    messageId,
    account: messageAccount
  })

  const toDelete = notifications.find((n) => {
    const content = n.content as ReactionNotificationContent
    return content.emoji === reaction && content.creator === socialId
  })

  if (toDelete === undefined) return result

  const context = (await ctx.db.findNotificationContexts({ card: cardId, account: messageAccount, limit: 1 }))[0]
  if (context == null) return result
  if (context.lastNotify != null && context.lastNotify.getTime() === toDelete.created.getTime()) {
    const lastNotification = (
      await ctx.db.findNotifications({
        account: messageAccount,
        context: context.id,
        created: {
          less: context.lastNotify
        },
        order: SortingOrder.Descending,
        limit: 1
      })
    )[0]
    if (lastNotification != null) {
      result.push({
        type: NotificationRequestEventType.UpdateNotificationContext,
        contextId: context.id,
        account: messageAccount,
        updates: {
          lastNotify: lastNotification.created
        },
        socialId,
        date: new Date()
      })
    }
  }

  result.push({
    type: NotificationRequestEventType.RemoveNotifications,
    contextId: toDelete.contextId,
    account: messageAccount,
    ids: [toDelete.id]
  })

  return result
}
async function notifyReaction (
  ctx: TriggerCtx,
  cardId: CardID,
  messageId: MessageID,
  reaction: Reaction
): Promise<RequestEvent[]> {
  const result: RequestEvent[] = []

  const message = await findMessage(ctx.db, ctx.metadata.filesUrl, ctx.workspace, cardId, messageId)
  if (message == null) return result

  const messageAccount = await findAccount(ctx, message.creator)
  if (messageAccount == null) return result

  const reactionAccount = await findAccount(ctx, reaction.creator)
  if (reactionAccount === messageAccount) return result

  const context = (await ctx.db.findNotificationContexts({ card: cardId, account: messageAccount }))[0]
  let contextId: ContextID | undefined = context?.id

  if (context == null) {
    contextId = await createContext(ctx, messageAccount, cardId, new Date(), new Date())
  }

  if (contextId == null) return result

  const content: ReactionNotificationContent = {
    emoji: reaction.reaction,
    creator: reaction.creator
  }
  result.push({
    type: NotificationRequestEventType.CreateNotification,
    notificationType: NotificationType.Reaction,
    account: messageAccount,
    cardId,
    contextId,
    messageId,
    messageCreated: message.created,
    date: reaction.created,
    content,
    socialId: message.creator
  })

  result.push({
    type: NotificationRequestEventType.UpdateNotificationContext,
    contextId,
    account: messageAccount,
    updates: {
      lastNotify: reaction.created
    },
    socialId: message.creator,
    date: reaction.created
  })
  return result
}

async function notifyMessage (ctx: TriggerCtx, message: Message, cardType: CardType): Promise<RequestEvent[]> {
  const cursor = ctx.db.getCollaboratorsCursor(message.cardId, message.created, BATCH_SIZE)
  const creatorAccount = await findAccount(ctx, message.creator)
  const result: RequestEvent[] = []

  let isFirstBatch = true

  for await (const dbCollaborators of cursor) {
    const collaborators: AccountID[] = dbCollaborators.map((it) => it.account)
    const contexts: NotificationContext[] = await ctx.db.findNotificationContexts({
      card: message.cardId,
      account: isFirstBatch && collaborators.length < BATCH_SIZE ? undefined : collaborators
    })

    for (const collaborator of collaborators) {
      try {
        const context = contexts.find((it) => it.account === collaborator)
        const res = await processCollaborator(ctx, cardType, message, collaborator, creatorAccount, context)
        result.push(...res)
      } catch (e) {
        ctx.ctx.error('Error on create notification', { collaborator, error: e })
      }
    }

    isFirstBatch = false
  }

  return result
}

async function processCollaborator (
  ctx: TriggerCtx,
  cardType: CardType,
  message: Message,
  collaborator: AccountID,
  creatorAccount?: AccountID,
  context?: NotificationContext
): Promise<RequestEvent[]> {
  const result: RequestEvent[] = []
  const isOwn = creatorAccount === collaborator
  const { contextId, events } = await createOrUpdateContext(ctx, message, collaborator, isOwn, context)

  if (!isOwn) {
    result.push({
      type: LabelRequestEventType.CreateLabel,
      account: collaborator,
      labelId: NewMessageLabelID,
      cardId: message.cardId,
      cardType,
      date: message.created,
      socialId: message.creator
    })
  }

  result.push(...events)

  if (contextId == null || isOwn) return result

  result.push({
    type: NotificationRequestEventType.CreateNotification,
    notificationType: NotificationType.Message,
    account: collaborator,
    contextId,
    cardId: message.cardId,
    messageId: message.id,
    messageCreated: message.created,
    date: message.created,
    socialId: message.creator
  })
  return result
}

async function createOrUpdateContext (
  ctx: TriggerCtx,
  message: Message,
  collaborator: AccountID,
  isOwn: boolean,
  context?: NotificationContext
): Promise<{
    contextId: ContextID | undefined
    events: RequestEvent[]
  }> {
  if (context == null) {
    const contextId = await createContext(
      ctx,
      collaborator,
      message.cardId,
      message.created,
      isOwn ? message.created : undefined,
      isOwn ? undefined : message.created
    )

    return {
      contextId,
      events: []
    }
  }

  const lastUpdate =
    context.lastUpdate == null || message.created > context.lastUpdate ? message.created : context.lastUpdate
  const lastView = isOwn && isContextRead(context) ? message.created : undefined

  return {
    contextId: context.id,
    events: [
      {
        type: NotificationRequestEventType.UpdateNotificationContext,
        contextId: context.id,
        account: collaborator,
        updates: {
          lastView,
          lastUpdate,
          lastNotify: isOwn ? undefined : message.created
        },
        socialId: message.creator,
        date: new Date()
      }
    ]
  }
}

async function createContext (
  ctx: TriggerCtx,
  account: AccountID,
  cardId: CardID,
  lastUpdate: Date,
  lastView?: Date,
  lastNotify?: Date
): Promise<ContextID | undefined> {
  try {
    const result = (await ctx.execute({
      type: NotificationRequestEventType.CreateNotificationContext,
      account,
      cardId,
      lastUpdate,
      lastView: lastView ?? new Date(lastUpdate.getTime() - 1),
      lastNotify,
      socialId: 'core:account:System' as SocialID,
      date: new Date()
    })) as CreateNotificationContextResult

    return result.id
  } catch (e) {
    return (
      await ctx.db.findNotificationContexts({
        account,
        card: cardId
      })
    )[0]?.id
  }
}

function isContextRead (context: NotificationContext): boolean {
  const { lastView, lastUpdate } = context

  if (lastView == null) {
    return false
  }

  return lastView >= lastUpdate
}
