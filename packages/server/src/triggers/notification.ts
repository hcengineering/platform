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
  type AddedCollaboratorsEvent,
  LabelRequestEventType,
  type NotificationContextUpdatedEvent,
  NotificationRequestEventType,
  NotificationResponseEventType,
  type RemovedCollaboratorsEvent,
  type RequestEvent
} from '@hcengineering/communication-sdk-types'
import { NewMessageLabelID, SubscriptionLabelID } from '@hcengineering/communication-types'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'

async function onAddedCollaborators(ctx: TriggerCtx, event: AddedCollaboratorsEvent): Promise<RequestEvent[]> {
  const { card, cardType, collaborators } = event
  const result: RequestEvent[] = []
  for (const collaborator of collaborators) {
    result.push({
      type: LabelRequestEventType.CreateLabel,
      card,
      cardType,
      account: collaborator,
      label: SubscriptionLabelID
    })

    result.push({
      type: NotificationRequestEventType.CreateNotificationContext,
      account: collaborator,
      card,
      lastUpdate: event.date,
      lastView: event.date
    })
  }
  return result
}

async function onRemovedCollaborators(ctx: TriggerCtx, event: RemovedCollaboratorsEvent): Promise<RequestEvent[]> {
  const { card, collaborators } = event
  const result: RequestEvent[] = []
  for (const collaborator of collaborators) {
    result.push({
      type: LabelRequestEventType.RemoveLabel,
      card,
      account: collaborator,
      label: SubscriptionLabelID
    })
  }
  return result
}

async function onNotificationContextUpdated(
  ctx: TriggerCtx,
  event: NotificationContextUpdatedEvent
): Promise<RequestEvent[]> {
  const { context: contextId, lastView } = event
  if (lastView == null) return []

  const context = (await ctx.db.findNotificationContexts({ id: contextId }))[0]
  if (context == null) return []

  if (context.lastView >= context.lastUpdate) {
    return [
      {
        type: LabelRequestEventType.RemoveLabel,
        label: NewMessageLabelID,
        card: context.card,
        account: context.account
      }
    ]
  }

  return []
}

const triggers: Triggers = [
  [
    'on_notification_context_updated',
    NotificationResponseEventType.NotificationContextUpdated,
    onNotificationContextUpdated as TriggerFn
  ],
  ['on_added_collaborators', NotificationResponseEventType.AddedCollaborators, onAddedCollaborators as TriggerFn],
  ['on_removed_collaborators', NotificationResponseEventType.RemovedCollaborators, onRemovedCollaborators as TriggerFn]
]

export default triggers
