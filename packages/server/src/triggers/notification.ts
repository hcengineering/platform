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
  AddCollaboratorsEvent,
  LabelEventType,
  MessageEventType,
  NotificationEventType,
  type Event,
  UpdateNotificationContextEvent,
  RemoveNotificationContextEvent,
  RemovePatchEvent,
  RemoveCollaboratorsEvent
} from '@hcengineering/communication-sdk-types'
import {
  type ActivityCollaboratorsUpdate,
  ActivityUpdateType,
  MessageType,
  NewMessageLabelID,
  NotificationType,
  SubscriptionLabelID
} from '@hcengineering/communication-types'
import { groupByArray } from '@hcengineering/core'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'
import { findAccount } from '../utils'
import { getAddCollaboratorsMessageContent, getRemoveCollaboratorsMessageContent } from './utils'

async function onAddedCollaborators (ctx: TriggerCtx, event: AddCollaboratorsEvent): Promise<Event[]> {
  const { cardId, cardType, collaborators } = event

  if (collaborators.length === 0) return []
  const result: Event[] = []

  for (const collaborator of collaborators) {
    result.push({
      type: LabelEventType.CreateLabel,
      cardId,
      cardType,
      account: collaborator,
      labelId: SubscriptionLabelID,
      date: event.date
    })
  }

  const account = await findAccount(ctx, event.socialId)

  const updateDate: ActivityCollaboratorsUpdate = {
    type: ActivityUpdateType.Collaborators,
    added: collaborators,
    removed: []
  }
  result.push({
    type: MessageEventType.CreateMessage,
    messageType: MessageType.Activity,
    cardId,
    cardType,
    content: await getAddCollaboratorsMessageContent(ctx, account, collaborators),
    socialId: event.socialId,
    date: event.date,
    extra: {
      action: 'update',
      update: updateDate
    }
  })
  return result
}

async function onRemovedCollaborators (ctx: TriggerCtx, event: RemoveCollaboratorsEvent): Promise<Event[]> {
  const { cardId, collaborators } = event
  if (collaborators.length === 0) return []
  const result: Event[] = []
  const contexts = await ctx.db.findNotificationContexts({ card: cardId, account: event.collaborators })
  for (const collaborator of collaborators) {
    const context = contexts.find((it) => it.account === collaborator)
    result.push({
      type: LabelEventType.RemoveLabel,
      cardId,
      account: collaborator,
      labelId: SubscriptionLabelID,
      date: event.date
    })

    if (context !== undefined && context.lastUpdate.getTime() > context.lastView.getTime()) {
      result.push({
        type: NotificationEventType.UpdateNotificationContext,
        contextId: context.id,
        account: collaborator,
        updates: {
          lastView: context.lastUpdate
        },
        date: new Date()
      })
    }
  }

  const updateDate: ActivityCollaboratorsUpdate = {
    type: ActivityUpdateType.Collaborators,
    added: [],
    removed: collaborators
  }
  const account = await findAccount(ctx, event.socialId)
  result.push({
    type: MessageEventType.CreateMessage,
    messageType: MessageType.Activity,
    cardId,
    cardType: event.cardType,
    content: await getRemoveCollaboratorsMessageContent(ctx, account, collaborators),
    socialId: event.socialId,
    date: event.date,
    extra: {
      action: 'update',
      update: updateDate
    }
  })

  return result
}

async function onNotificationContextUpdated (ctx: TriggerCtx, event: UpdateNotificationContextEvent): Promise<Event[]> {
  const { contextId, updates } = event
  const { lastView } = updates
  if (lastView == null) return []

  const context = (await ctx.db.findNotificationContexts({ id: contextId }))[0]
  if (context == null) return []
  const result: Event[] = []

  if (context.lastView >= context.lastUpdate) {
    result.push({
      type: LabelEventType.RemoveLabel,
      labelId: NewMessageLabelID,
      cardId: context.cardId,
      account: context.account,
      date: new Date()
    })
  }

  result.push({
    type: NotificationEventType.UpdateNotification,
    account: context.account,
    contextId: context.id,
    query: {
      type: NotificationType.Message,
      untilDate: context.lastView
    },
    updates: {
      read: true
    }
  })

  return result
}

async function onNotificationContextRemoved (ctx: TriggerCtx, event: RemoveNotificationContextEvent): Promise<Event[]> {
  const context = ctx.removedContexts.get(event.contextId)
  if (context == null) return []

  return [
    {
      type: LabelEventType.RemoveLabel,
      labelId: NewMessageLabelID,
      cardId: context.cardId,
      account: context.account,
      date: event.date
    }
  ]
}

async function onMessagesRemoved (ctx: TriggerCtx, event: RemovePatchEvent): Promise<Event[]> {
  const notifications = await ctx.db.findNotifications({
    card: event.cardId,
    messageId: event.messageId
  })

  if (notifications.length === 0) return []

  const result: Event[] = []

  const byContextId = groupByArray(notifications, (it) => it.contextId)
  for (const [context, ns] of byContextId.entries()) {
    result.push({
      type: NotificationEventType.RemoveNotifications,
      contextId: context,
      account: ns[0].account,
      ids: notifications.map((it) => it.id)
    })
  }

  return result
}

const triggers: Triggers = [
  [
    'on_notification_context_updated',
    NotificationEventType.UpdateNotificationContext,
    onNotificationContextUpdated as TriggerFn
  ],
  [
    'on_notification_context_removed',
    NotificationEventType.RemoveNotificationContext,
    onNotificationContextRemoved as TriggerFn
  ],
  ['on_added_collaborators', NotificationEventType.AddCollaborators, onAddedCollaborators as TriggerFn],
  ['on_removed_collaborators', NotificationEventType.RemoveCollaborators, onRemovedCollaborators as TriggerFn],
  ['remove_notifications_on_messages_removed', MessageEventType.RemovePatch, onMessagesRemoved as TriggerFn]
]

export default triggers
