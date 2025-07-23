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
  CreateMessageEvent,
  CreateMessagesGroupEvent,
  type Event,
  MessageEventType,
  NotificationEventType,
  PatchEvent,
  RemovePatchEvent,
  ThreadPatchEvent
} from '@hcengineering/communication-sdk-types'
import { type CardID, MessageType } from '@hcengineering/communication-types'
import { generateToken } from '@hcengineering/server-token'
import { type AccountUuid, concatLink, systemAccountUuid } from '@hcengineering/core'
import { extractReferences } from '@hcengineering/text-core'
import { markdownToMarkup } from '@hcengineering/text-markdown'

import type { Enriched, TriggerCtx, TriggerFn, Triggers } from '../types'
import { findAccount } from '../utils'
import { findMessage } from './utils'
import { generateMessageId } from '../messageId'

async function onMessagesGroupCreated (ctx: TriggerCtx, event: CreateMessagesGroupEvent): Promise<Event[]> {
  ctx.registeredCards.delete(event.group.cardId)
  return []
}

async function onMessageRemoved (ctx: TriggerCtx, event: Enriched<RemovePatchEvent>): Promise<Event[]> {
  const { cardId } = event
  const thread = await ctx.db.findThread(cardId)
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
          repliesCountOp: 'decrement'
        }
      },
      date: event.date,
      socialId: event.socialId
    }
  ]
}

async function registerCard (ctx: TriggerCtx, event: PatchEvent): Promise<Event[]> {
  const { workspace, metadata } = ctx
  const card: CardID = event.cardId

  if (ctx.registeredCards.has(card) || metadata.msg2fileUrl === '') return []

  try {
    const token = generateToken(systemAccountUuid, workspace, undefined, ctx.metadata.secret)
    await fetch(concatLink(metadata.msg2fileUrl, '/register/:card').replaceAll(':card', card), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    })
    ctx.registeredCards.add(card)
  } catch (e) {
    ctx.ctx.error('Failed to register card', { error: e })
  }

  return []
}

async function addCollaborators (ctx: TriggerCtx, event: Enriched<CreateMessageEvent>): Promise<Event[]> {
  const { messageType, socialId, content, cardId, cardType, date } = event
  if (messageType === MessageType.Activity) return []
  const account = await findAccount(ctx, socialId)
  const collaborators: AccountUuid[] = []

  if (account !== undefined) {
    collaborators.push(account)
  }

  const markup = markdownToMarkup(content)
  const references = extractReferences(markup)
  const personIds = references
    .filter((it) => ['contact:class:Person', 'contact:mixin:Employee'].includes(it.objectClass))
    .map((it) => it.objectId)
    .filter((it) => it != null) as string[]
  const accounts = await ctx.db.getAccountsByPersonIds(personIds)

  collaborators.push(...accounts)

  if (collaborators.length === 0) {
    return []
  }

  return [
    {
      type: NotificationEventType.AddCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId,
      date: new Date(date.getTime() - 1)
    }
  ]
}

async function addThreadReply (ctx: TriggerCtx, event: Enriched<CreateMessageEvent>): Promise<Event[]> {
  if (event.messageType !== MessageType.Message || event.extra?.threadRoot === true) {
    return []
  }
  const { cardId, socialId, date } = event
  const thread = await ctx.db.findThread(cardId)

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
          lastReply: date,
          repliesCountOp: 'increment'
        }
      },
      socialId,
      date
    }
  ]
}

async function onThreadAttached (ctx: TriggerCtx, event: Enriched<ThreadPatchEvent>): Promise<Event[]> {
  if (event.operation.opcode !== 'attach') return []
  const { message } = await findMessage(ctx.db, ctx.metadata.filesUrl, ctx.workspace, event.cardId, event.messageId, {
    attachments: true
  })

  if (message === undefined) return []

  const result: Event[] = []

  if (message.type === MessageType.Activity || message.extra?.threadRoot === true) {
    return []
  }

  const messageId = generateMessageId()

  result.push({
    messageId,
    type: MessageEventType.CreateMessage,
    messageType: message.type,
    cardId: event.operation.threadId,
    cardType: event.operation.threadType,
    content: message.content,
    extra: { ...message.extra, threadRoot: true },
    socialId: message.creator,
    date: message.created,
    options: {
      noNotify: true
    }
  })

  result.push({
    type: MessageEventType.AttachmentPatch,
    cardId: event.operation.threadId,
    messageId,
    operations: [
      {
        opcode: 'add',
        attachments: message.attachments.map((it) => ({
          id: it.id,
          type: it.type,
          params: it.params
        }))
      }
    ],
    socialId: message.creator,
    date: message.created
  })

  return result
}

const triggers: Triggers = [
  ['add_collaborators_on_message_created', MessageEventType.CreateMessage, addCollaborators as TriggerFn],
  ['add_thread_reply_on_message_created', MessageEventType.CreateMessage, addThreadReply as TriggerFn],
  ['register_card_on_message_created', MessageEventType.CreateMessage, registerCard as TriggerFn],
  ['register_card_on_update_patch', MessageEventType.UpdatePatch, registerCard as TriggerFn],
  ['register_card_on_remove_patch', MessageEventType.RemovePatch, registerCard as TriggerFn],
  ['register_card_on_reaction_patch', MessageEventType.ReactionPatch, registerCard as TriggerFn],
  ['register_card_on_blob_patch', MessageEventType.BlobPatch, registerCard as TriggerFn],
  ['register_card_on_attachment_patch', MessageEventType.AttachmentPatch, registerCard as TriggerFn],
  ['register_card_on_thread_patch', MessageEventType.ThreadPatch, registerCard as TriggerFn],

  ['on_messages_group_created', MessageEventType.CreateMessagesGroup, onMessagesGroupCreated as TriggerFn],
  ['remove_reply_on_messages_removed', MessageEventType.RemovePatch, onMessageRemoved as TriggerFn],
  ['on_thread_created', MessageEventType.ThreadPatch, onThreadAttached as TriggerFn]
]

export default triggers
