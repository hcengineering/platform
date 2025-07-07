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
  LabelEventType,
  NotificationEventType,
  type Event,
  MessageEventType
} from '@hcengineering/communication-sdk-types'
import {
  type AccountID,
  type CardID,
  type CardType,
  type ContextID,
  Markdown,
  type MessageID,
  NewMessageLabelID,
  type NotificationContext,
  NotificationType,
  type ReactionNotificationContent,
  type SocialID,
  SortingOrder
} from '@hcengineering/communication-types'

import type { Enriched, TriggerCtx } from '../types'
import { findAccount } from '../utils'
import { findMessage, getNameBySocialID } from '../triggers/utils'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { jsonToMarkup, markupToText } from '@hcengineering/text-core'

const BATCH_SIZE = 500

export async function notify (ctx: TriggerCtx, event: Enriched<Event>): Promise<Event[]> {
  switch (event.type) {
    case MessageEventType.CreateMessage: {
      if (event.options?.noNotify === true || event.messageId == null) return []
      return await notifyMessage(
        ctx,
        event.cardId,
        event.cardType,
        event.messageId,
        event.content,
        event.socialId,
        event.date
      )
    }
    case MessageEventType.ReactionPatch: {
      if (event.operation.opcode === 'add') {
        return await notifyReaction(
          ctx,
          event.cardId,
          event.messageId,
          event.operation.reaction,
          event.socialId,
          event.date
        )
      } else if (event.operation.opcode === 'remove') {
        return await removeReactionNotification(
          ctx,
          event.cardId,
          event.messageId,
          event.operation.reaction,
          event.socialId
        )
      }
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
): Promise<Event[]> {
  const result: Event[] = []
  const { message } = await findMessage(ctx.db, ctx.metadata.filesUrl, ctx.workspace, cardId, messageId)
  if (message === undefined) return result

  const messageAccount = await findAccount(ctx, message.creator)
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
        type: NotificationEventType.UpdateNotificationContext,
        contextId: context.id,
        account: messageAccount,
        updates: {
          lastNotify: lastNotification.created
        },
        date: new Date()
      })
    }
  }

  result.push({
    type: NotificationEventType.RemoveNotifications,
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
  reaction: string,
  socialId: SocialID,
  date: Date
): Promise<Event[]> {
  const result: Event[] = []

  const { message, blobId } = await findMessage(ctx.db, ctx.metadata.filesUrl, ctx.workspace, cardId, messageId)
  if (message == null) return result

  const messageAccount = await findAccount(ctx, message.creator)
  if (messageAccount == null) return result

  const reactionAccount = await findAccount(ctx, socialId)
  if (reactionAccount === messageAccount) return result

  const context = (await ctx.db.findNotificationContexts({ card: cardId, account: messageAccount }))[0]
  let contextId: ContextID | undefined = context?.id

  if (context == null) {
    contextId = await createContext(ctx, messageAccount, cardId, date, undefined, date)
  }

  if (contextId == null) return result

  const content: ReactionNotificationContent = {
    emoji: reaction,
    creator: socialId,
    senderName: (await getNameBySocialID(ctx, socialId)) ?? 'System',
    title: 'Reacted to your message',
    shortText: reaction
  }
  result.push({
    type: NotificationEventType.CreateNotification,
    notificationType: NotificationType.Reaction,
    account: messageAccount,
    cardId,
    contextId,
    messageId,
    messageCreated: message.created,
    blobId,
    date,
    content,
    read: false
  })

  if ((context?.lastNotify?.getTime() ?? date.getTime()) < date.getTime()) {
    result.push({
      type: NotificationEventType.UpdateNotificationContext,
      contextId,
      account: messageAccount,
      updates: {
        lastNotify: date
      },
      date
    })
  }
  return result
}

async function notifyMessage (
  ctx: TriggerCtx,
  cardId: CardID,
  cardType: CardType,
  messageId: MessageID,
  markdown: Markdown,
  socialId: SocialID,
  date: Date
): Promise<Event[]> {
  const cursor = ctx.db.getCollaboratorsCursor(cardId, date, BATCH_SIZE)
  const creatorAccount = await findAccount(ctx, socialId)
  const result: Event[] = []

  const cardTitle = (await ctx.db.getCardTitle(cardId)) ?? 'New message'

  let isFirstBatch = true

  for await (const dbCollaborators of cursor) {
    const collaborators: AccountID[] = dbCollaborators.map((it) => it.account)
    const contexts: NotificationContext[] = await ctx.db.findNotificationContexts({
      card: cardId,
      account: isFirstBatch && collaborators.length < BATCH_SIZE ? undefined : collaborators
    })

    for (const collaborator of collaborators) {
      try {
        const context = contexts.find((it) => it.account === collaborator)
        const res = await processCollaborator(
          ctx,
          cardId,
          cardType,
          cardTitle,
          messageId,
          markdown,
          date,
          collaborator,
          socialId,
          creatorAccount,
          context
        )
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
  cardId: CardID,
  cardType: CardType,
  cardTitle: string,
  messageId: MessageID,
  markdown: Markdown,
  date: Date,
  collaborator: AccountID,
  creatorSocialId: SocialID,
  creatorAccount?: AccountID,
  context?: NotificationContext
): Promise<Event[]> {
  const result: Event[] = []
  const isOwn = creatorAccount === collaborator
  const { contextId, events } = await createOrUpdateContext(ctx, cardId, date, collaborator, isOwn, context)

  if (!isOwn) {
    result.push({
      type: LabelEventType.CreateLabel,
      account: collaborator,
      labelId: NewMessageLabelID,
      cardId,
      cardType,
      date
    })
  }

  result.push(...events)

  if (contextId == null || isOwn) return result

  const text = markupToText(jsonToMarkup(markdownToMarkup(markdown)))
  const shortText = text.slice(0, 100)
  result.push({
    type: NotificationEventType.CreateNotification,
    notificationType: NotificationType.Message,
    account: collaborator,
    contextId,
    cardId,
    messageId,
    messageCreated: date,
    date,
    content: {
      senderName: (await getNameBySocialID(ctx, creatorSocialId)) ?? 'System',
      title: cardTitle,
      shortText: shortText.length < text.length ? shortText + '...' : text
    },
    read: date.getTime() < (context?.lastView?.getTime() ?? 0)
  })
  return result
}

async function createOrUpdateContext (
  ctx: TriggerCtx,
  cardId: CardID,
  date: Date,
  collaborator: AccountID,
  isOwn: boolean,
  context?: NotificationContext
): Promise<{
    contextId: ContextID | undefined
    events: Event[]
  }> {
  if (context == null) {
    const contextId = await createContext(ctx, collaborator, cardId, date, isOwn ? date : undefined, date)

    return {
      contextId,
      events: []
    }
  }

  const lastUpdate = context.lastUpdate == null || date > context.lastUpdate ? date : context.lastUpdate
  const lastView = isOwn && isContextRead(context) ? date : undefined

  return {
    contextId: context.id,
    events: [
      {
        type: NotificationEventType.UpdateNotificationContext,
        contextId: context.id,
        account: collaborator,
        updates: {
          lastView,
          lastUpdate,
          lastNotify: isOwn ? undefined : date
        },
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
  lastView: Date | undefined,
  lastNotify: Date
): Promise<ContextID | undefined> {
  try {
    const result = (await ctx.execute({
      type: NotificationEventType.CreateNotificationContext,
      account,
      cardId,
      lastUpdate,
      lastView: lastView ?? new Date(lastUpdate.getTime() - 1),
      lastNotify,
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
