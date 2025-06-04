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
  type CardRemovedEvent,
  CardResponseEventType,
  type CardTypeUpdatedEvent,
  MessageRequestEventType,
  NotificationRequestEventType,
  type RequestEvent
} from '@hcengineering/communication-sdk-types'
import { type ActivityTypeUpdate, ActivityUpdateType, MessageType } from '@hcengineering/communication-types'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'
import { getNameBySocialID } from './utils'

async function createActivityOnCardTypeUpdate (ctx: TriggerCtx, event: CardTypeUpdatedEvent): Promise<RequestEvent[]> {
  const updateDate: ActivityTypeUpdate = {
    type: ActivityUpdateType.Type,
    newType: event.cardType
  }

  const sender = await getNameBySocialID(ctx, event.creator)

  return [
    {
      type: MessageRequestEventType.CreateMessage,
      messageType: MessageType.Activity,
      card: event.card,
      cardType: event.cardType,
      content: `${sender} changed type`,
      creator: event.creator,
      created: event.created,
      data: {
        action: 'update',
        update: updateDate
      }
    }
  ]
}

async function onCardTypeUpdates (ctx: TriggerCtx, event: CardTypeUpdatedEvent): Promise<RequestEvent[]> {
  await ctx.db.updateCollaborators({ card: event.card }, { cardType: event.cardType })
  await ctx.db.updateLabels(event.card, { cardType: event.cardType })
  await ctx.db.updateThread(event.card, { threadType: event.cardType })
  return []
}

async function removeCollaborators (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeCollaborators(event.card, {})
  return []
}

async function removeLabels (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeLabels({ card: event.card })
  return []
}

async function removeThreads (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeThreads({ card: event.card })
  await ctx.db.removeThreads({ thread: event.card })
  return []
}

async function removeNotificationContexts (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  const result: RequestEvent[] = []
  const contexts = await ctx.db.findNotificationContexts({ card: event.card })
  for (const context of contexts) {
    result.push({
      type: NotificationRequestEventType.RemoveNotificationContext,
      context: context.id,
      account: context.account
    })
  }
  return result
}

const triggers: Triggers = [
  ['on_card_type_updates', CardResponseEventType.CardTypeUpdated, onCardTypeUpdates as TriggerFn],
  [
    'create_activity_on_card_type_updates',
    CardResponseEventType.CardTypeUpdated,
    createActivityOnCardTypeUpdate as TriggerFn
  ],
  ['remove_collaborators_on_card_removed', CardResponseEventType.CardRemoved, removeCollaborators as TriggerFn],
  ['remove_labels_on_card_removed', CardResponseEventType.CardRemoved, removeLabels as TriggerFn],
  ['remove_threads_on_card_removed', CardResponseEventType.CardRemoved, removeThreads as TriggerFn],
  [
    'remove_notification_contexts_on_card_removed',
    CardResponseEventType.CardRemoved,
    removeNotificationContexts as TriggerFn
  ]
]

export default triggers
