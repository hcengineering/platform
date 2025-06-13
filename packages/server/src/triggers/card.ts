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
import { type ActivityTypeUpdate, ActivityUpdateType, MessageType, SocialID } from '@hcengineering/communication-types'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'
import { getNameBySocialID } from './utils'

async function createActivityOnCardTypeUpdate (ctx: TriggerCtx, event: CardTypeUpdatedEvent): Promise<RequestEvent[]> {
  const updateDate: ActivityTypeUpdate = {
    type: ActivityUpdateType.Type,
    newType: event.cardType
  }

  const sender = await getNameBySocialID(ctx, event.socialId)

  return [
    {
      type: MessageRequestEventType.CreateMessage,
      messageType: MessageType.Activity,
      cardId: event.cardId,
      cardType: event.cardType,
      content: `${sender} changed type`,
      socialId: event.socialId,
      date: event.date,
      extra: {
        action: 'update',
        update: updateDate
      }
    }
  ]
}

async function onCardTypeUpdates (ctx: TriggerCtx, event: CardTypeUpdatedEvent): Promise<RequestEvent[]> {
  await ctx.db.updateCollaborators({ card: event.cardId }, { cardType: event.cardType })
  await ctx.db.updateLabels(event.cardId, { cardType: event.cardType })
  await ctx.db.updateThread(event.cardId, { threadType: event.cardType })
  return []
}

async function removeCardCollaborators (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeCollaborators(event.cardId, [], true)
  return []
}

async function removeCardLabels (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeLabels({ cardId: event.cardId })
  return []
}

async function removeCardThreads (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeThreads({ cardId: event.cardId })
  await ctx.db.removeThreads({ threadId: event.cardId })
  return []
}

async function removeNotificationContexts (ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  const result: RequestEvent[] = []
  const contexts = await ctx.db.findNotificationContexts({ card: event.cardId })
  for (const context of contexts) {
    result.push({
      type: NotificationRequestEventType.RemoveNotificationContext,
      contextId: context.id,
      account: context.account,
      socialId: 'core:account:System' as SocialID,
      date: new Date()
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
  ['remove_collaborators_on_card_removed', CardResponseEventType.CardRemoved, removeCardCollaborators as TriggerFn],
  ['remove_labels_on_card_removed', CardResponseEventType.CardRemoved, removeCardLabels as TriggerFn],
  ['remove_threads_on_card_removed', CardResponseEventType.CardRemoved, removeCardThreads as TriggerFn],
  [
    'remove_notification_contexts_on_card_removed',
    CardResponseEventType.CardRemoved,
    removeNotificationContexts as TriggerFn
  ]
]

export default triggers
