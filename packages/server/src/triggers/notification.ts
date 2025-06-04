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
  MessageRequestEventType,
  MessageResponseEventType,
  type NotificationContextRemovedEvent,
  type NotificationContextUpdatedEvent,
  NotificationRequestEventType,
  NotificationResponseEventType,
  type PatchCreatedEvent,
  type RemovedCollaboratorsEvent,
  type RequestEvent
} from '@hcengineering/communication-sdk-types'
import {
  type ActivityCollaboratorsUpdate,
  ActivityUpdateType,
  MessageType,
  NewMessageLabelID,
  NotificationType,
  PatchType,
  SubscriptionLabelID
} from '@hcengineering/communication-types'
import { groupByArray } from '@hcengineering/core'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'
import { findAccount } from '../utils'
import { getAddCollaboratorsMessageContent, getRemoveCollaboratorsMessageContent } from './utils'

async function onAddedCollaborators (ctx: TriggerCtx, event: AddedCollaboratorsEvent): Promise<RequestEvent[]> {
  const { card, cardType, collaborators } = event
  if (collaborators.length === 0) return []
  const result: RequestEvent[] = []

  for (const collaborator of collaborators) {
    result.push({
      type: LabelRequestEventType.CreateLabel,
      card,
      cardType,
      account: collaborator,
      label: SubscriptionLabelID
    })
  }

  const account = await findAccount(ctx, event.creator)

  const updateDate: ActivityCollaboratorsUpdate = {
    type: ActivityUpdateType.Collaborators,
    added: collaborators,
    removed: []
  }
  result.push({
    type: MessageRequestEventType.CreateMessage,
    messageType: MessageType.Activity,
    card,
    cardType,
    content: await getAddCollaboratorsMessageContent(ctx, account, collaborators),
    creator: event.creator,
    created: event.created,
    data: {
      action: 'update',
      update: updateDate
    }
  })
  return result
}

async function onRemovedCollaborators (ctx: TriggerCtx, event: RemovedCollaboratorsEvent): Promise<RequestEvent[]> {
  const { card, collaborators } = event
  if (collaborators.length === 0) return []
  const result: RequestEvent[] = []
  const contexts = await ctx.db.findNotificationContexts({ card, account: event.collaborators })
  for (const collaborator of collaborators) {
    const context = contexts.find((it) => it.account === collaborator)
    result.push({
      type: LabelRequestEventType.RemoveLabel,
      card,
      account: collaborator,
      label: SubscriptionLabelID
    })

    if (context !== undefined && context.lastUpdate.getTime() > context.lastView.getTime()) {
      result.push({
        type: NotificationRequestEventType.UpdateNotificationContext,
        context: context.id,
        account: collaborator,
        updates: {
          lastView: context.lastUpdate
        }
      })
    }
  }

  const updateDate: ActivityCollaboratorsUpdate = {
    type: ActivityUpdateType.Collaborators,
    added: [],
    removed: collaborators
  }
  const account = await findAccount(ctx, event.creator)
  result.push({
    type: MessageRequestEventType.CreateMessage,
    messageType: MessageType.Activity,
    card,
    cardType: event.cardType,
    content: await getRemoveCollaboratorsMessageContent(ctx, account, collaborators),
    creator: event.creator,
    created: event.created,
    data: {
      action: 'update',
      update: updateDate
    }
  })

  return result
}

async function onNotificationContextUpdated (
  ctx: TriggerCtx,
  event: NotificationContextUpdatedEvent
): Promise<RequestEvent[]> {
  const { context: contextId, lastView } = event
  if (lastView == null) return []

  const context = (await ctx.db.findNotificationContexts({ id: contextId }))[0]
  if (context == null) return []
  const result: RequestEvent[] = []

  if (context.lastView >= context.lastUpdate) {
    result.push({
      type: LabelRequestEventType.RemoveLabel,
      label: NewMessageLabelID,
      card: context.card,
      account: context.account
    })
  }

  result.push({
    type: NotificationRequestEventType.UpdateNotification,
    query: {
      account: context.account,
      context: context.id,
      type: NotificationType.Message,
      created: {
        lessOrEqual: context.lastView
      }
    },
    updates: {
      read: true
    }
  })

  return result
}

async function onNotificationContextRemoved (
  ctx: TriggerCtx,
  event: NotificationContextRemovedEvent
): Promise<RequestEvent[]> {
  const { context } = event

  const result: RequestEvent[] = []

  result.push({
    type: LabelRequestEventType.RemoveLabel,
    label: NewMessageLabelID,
    card: context.card,
    account: context.account
  })

  return result
}

async function onMessagesRemoved (ctx: TriggerCtx, event: PatchCreatedEvent): Promise<RequestEvent[]> {
  if (event.patch.type !== PatchType.remove) return []

  const notifications = await ctx.db.findNotifications({
    card: event.card,
    messageId: event.patch.message
  })

  if (notifications.length === 0) return []

  const result: RequestEvent[] = []

  const byContextId = groupByArray(notifications, (it) => it.context)
  for (const [context, ns] of byContextId.entries()) {
    result.push({
      type: NotificationRequestEventType.RemoveNotifications,
      context,
      account: ns[0].account,
      ids: notifications.map((it) => it.id)
    })
  }

  return result
}

const triggers: Triggers = [
  [
    'on_notification_context_updated',
    NotificationResponseEventType.NotificationContextUpdated,
    onNotificationContextUpdated as TriggerFn
  ],
  [
    'on_notification_context_removed',
    NotificationResponseEventType.NotificationContextRemoved,
    onNotificationContextRemoved as TriggerFn
  ],
  ['on_added_collaborators', NotificationResponseEventType.AddedCollaborators, onAddedCollaborators as TriggerFn],
  ['on_removed_collaborators', NotificationResponseEventType.RemovedCollaborators, onRemovedCollaborators as TriggerFn],
  ['remove_notifications_on_messages_removed', MessageResponseEventType.PatchCreated, onMessagesRemoved as TriggerFn]
]

export default triggers
