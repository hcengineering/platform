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
  NotificationRequestEventType,
  type RequestEvent
} from '@hcengineering/communication-sdk-types'
import type { CardID } from '@hcengineering/communication-types'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'

async function onCardTypeUpdates(ctx: TriggerCtx, event: CardTypeUpdatedEvent): Promise<RequestEvent[]> {
  await ctx.db.updateCollaborators({ card: event.card }, { cardType: event.cardType })
  await ctx.db.updateLabels({ card: event.card }, { cardType: event.cardType })
  await ctx.db.updateThread(event.card, { threadType: event.cardType })
  return []
}

async function removeCollaborators(ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeCollaborators(event.card)
  return []
}

async function removeLabels(ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeLabels({ card: event.card })
  return []
}

async function removeThreads(ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeThreads({ card: event.card })
  return []
}

async function removeMessages(ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
  await ctx.db.removeMessages(event.card)
  await ctx.db.removePatches(event.card)
  await ctx.db.removeFiles({ card: event.card })
  await removeMessageGroups(ctx, event.card)

  return []
}

async function removeNotificationContexts(ctx: TriggerCtx, event: CardRemovedEvent): Promise<RequestEvent[]> {
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

async function removeMessageGroups(ctx: TriggerCtx, card: CardID): Promise<void> {
  while (true) {
    const groups = await ctx.db.findMessagesGroups({ card })
    if (groups.length === 0) return

    for (const group of groups) {
      ///TODO: delete blob
      await ctx.db.removeMessagesGroup(group.card, group.blobId)
    }
  }
}

const triggers: Triggers = [
  ['on_card_type_updates', CardResponseEventType.CardTypeUpdated, onCardTypeUpdates as TriggerFn],
  ['remove_collaborators_on_card_removed', CardResponseEventType.CardRemoved, removeCollaborators as TriggerFn],
  ['remove_labels_on_card_removed', CardResponseEventType.CardRemoved, removeLabels as TriggerFn],
  ['remove_threads_on_card_removed', CardResponseEventType.CardRemoved, removeThreads as TriggerFn],
  ['remove_messages_on_card_removed', CardResponseEventType.CardRemoved, removeMessages as TriggerFn],
  [
    'remove_notification_contexts_on_card_removed',
    CardResponseEventType.CardRemoved,
    removeNotificationContexts as TriggerFn
  ]
]

export default triggers
