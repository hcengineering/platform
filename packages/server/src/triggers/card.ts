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
  CardEventType,
  MessageEventType,
  NotificationEventType,
  type Event,
  UpdateCardTypeEvent,
  RemoveCardEvent
} from '@hcengineering/communication-sdk-types'
import { type ActivityTypeUpdate, ActivityUpdateType, MessageType } from '@hcengineering/communication-types'

import type { Enriched, TriggerCtx, TriggerFn, Triggers } from '../types'

async function createActivityOnCardTypeUpdate (ctx: TriggerCtx, event: UpdateCardTypeEvent): Promise<Event[]> {
  const updateDate: ActivityTypeUpdate = {
    type: ActivityUpdateType.Type,
    newType: event.cardType
  }

  return [
    {
      type: MessageEventType.CreateMessage,
      messageType: MessageType.Activity,
      cardId: event.cardId,
      cardType: event.cardType,
      content: 'Changed type',
      socialId: event.socialId,
      date: event.date,
      extra: {
        action: 'update',
        update: updateDate
      }
    }
  ]
}

async function onCardTypeUpdates (ctx: TriggerCtx, event: Enriched<UpdateCardTypeEvent>): Promise<Event[]> {
  await ctx.db.updateCollaborators({ card: event.cardId }, { cardType: event.cardType })
  await ctx.db.updateLabels(event.cardId, { cardType: event.cardType })

  const thread = (await ctx.db.findThreads({ threadId: event.cardId, limit: 1 }))[0]
  if (thread === undefined) return []

  return [
    {
      type: MessageEventType.ThreadPatch,
      cardId: thread.cardId,
      messageId: thread.messageId,
      operation: {
        opcode: 'update',
        threadId: thread.threadId,
        updates: {
          threadType: event.cardType
        }
      },
      socialId: event.socialId,
      date: event.date
    }
  ]
}

async function removeCardCollaborators (ctx: TriggerCtx, event: UpdateCardTypeEvent): Promise<Event[]> {
  await ctx.db.removeCollaborators(event.cardId, [], true)
  return []
}

async function removeCardLabels (ctx: TriggerCtx, event: UpdateCardTypeEvent): Promise<Event[]> {
  await ctx.db.removeLabels({ cardId: event.cardId })
  return []
}

async function removeCardThreads (ctx: TriggerCtx, event: RemoveCardEvent): Promise<Event[]> {
  await ctx.db.removeThreads({ cardId: event.cardId })
  await ctx.db.removeThreads({ threadId: event.cardId })
  return []
}

async function removeNotificationContexts (ctx: TriggerCtx, event: RemoveCardEvent): Promise<Event[]> {
  const result: Event[] = []
  const contexts = await ctx.db.findNotificationContexts({ card: event.cardId })
  for (const context of contexts) {
    result.push({
      type: NotificationEventType.RemoveNotificationContext,
      contextId: context.id,
      account: context.account,
      date: new Date()
    })
  }
  return result
}

const triggers: Triggers = [
  ['on_card_type_updates', CardEventType.UpdateCardType, onCardTypeUpdates as TriggerFn],
  ['create_activity_on_card_type_updates', CardEventType.UpdateCardType, createActivityOnCardTypeUpdate as TriggerFn],
  ['remove_collaborators_on_card_removed', CardEventType.RemoveCard, removeCardCollaborators as TriggerFn],
  ['remove_labels_on_card_removed', CardEventType.RemoveCard, removeCardLabels as TriggerFn],
  ['remove_threads_on_card_removed', CardEventType.RemoveCard, removeCardThreads as TriggerFn],
  ['remove_notification_contexts_on_card_removed', CardEventType.RemoveCard, removeNotificationContexts as TriggerFn]
]

export default triggers
