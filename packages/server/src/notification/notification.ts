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
  type RequestEvent,
  RequestEventType,
  type ResponseEvent,
  ResponseEventType
} from '@hcengineering/communication-sdk-types'
import {MessageType, type AccountID, type CardID, type ContextID, type Message, type NotificationContext } from '@hcengineering/communication-types'

import type { TriggerCtx } from '../types'
import { findAccount } from '../utils'

const BATCH_SIZE = 500

export async function notify (ctx: TriggerCtx, event: ResponseEvent): Promise<RequestEvent[]> {
  switch (event.type) {
    case ResponseEventType.MessageCreated: {
      return await notifyMessage(ctx, event.message)
    }
  }

  return []
}

async function notifyMessage (ctx: TriggerCtx, message: Message): Promise<RequestEvent[]> {
  const cursor = ctx.db.getCollaboratorsCursor(message.card, message.created, BATCH_SIZE)
  const creatorAccount = await findAccount(ctx, message.creator)
  const result: RequestEvent[] = []

  let isFirstBatch = true

  for await (const dbCollaborators of cursor) {
    const collaborators: AccountID[] = dbCollaborators.map((it) => it.account)
    const contexts: NotificationContext[] = await ctx.db.findContexts({
      card: message.card,
      account: isFirstBatch && collaborators.length < BATCH_SIZE ? undefined : collaborators
    })

    for (const collaborator of collaborators) {
      try {
        const context = contexts.find((it) => it.account === collaborator)
        const res = await processCollaborator(ctx, message, collaborator, creatorAccount, context)
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
  message: Message,
  collaborator: AccountID,
  creatorAccount?: AccountID,
  context?: NotificationContext
): Promise<RequestEvent[]> {
  const result: RequestEvent[] = []
  const isOwn = creatorAccount === collaborator
  const { contextId, events } = await createOrUpdateContext(ctx, message, collaborator, isOwn, context)

  result.push(...events)

  if (contextId == null || isOwn) return result
  if(message.type !== MessageType.Message) return result

  result.push({
    type: RequestEventType.CreateNotification,
    account: collaborator,
    context: contextId,
    message: message.id,
    created: message.created
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
      message.card,
      message.created,
      isOwn ? message.created : undefined
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
        type: RequestEventType.UpdateNotificationContext,
        context: context.id,
        account: collaborator,
        lastView,
        lastUpdate
      }
    ]
  }
}

async function createContext (
  ctx: TriggerCtx,
  account: AccountID,
  card: CardID,
  lastUpdate: Date,
  lastView?: Date
): Promise<ContextID | undefined> {
  try {
    const result = (await ctx.execute({
      type: RequestEventType.CreateNotificationContext,
      account,
      card,
      lastUpdate,
      lastView: lastView ?? new Date(lastUpdate.getTime() - 1)
    })) as CreateNotificationContextResult

    return result.id
  } catch (e) {
    return (
      await ctx.db.findContexts({
        account,
        card
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
