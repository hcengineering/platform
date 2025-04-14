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
  type CreatePatchEvent,
  type FileCreatedEvent,
  type FileRemovedEvent,
  type MessageCreatedEvent,
  MessageRequestEventType,
  MessageResponseEventType,
  type MessagesGroupCreatedEvent,
  type MessagesRemovedEvent,
  NotificationRequestEventType,
  type PatchCreatedEvent,
  type RequestEvent,
  type UpdateThreadEvent
} from '@hcengineering/communication-sdk-types'
import { type CardID, PatchType, type File } from '@hcengineering/communication-types'
import { generateToken } from '@hcengineering/server-token'
import { concatLink, systemAccountUuid } from '@hcengineering/core'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'
import { findAccount } from '../utils'

async function onMessagesGroupCreated(ctx: TriggerCtx, event: MessagesGroupCreatedEvent): Promise<RequestEvent[]> {
  ctx.registeredCards.delete(event.group.card)
  return []
}

async function onMessagesRemoved(ctx: TriggerCtx, event: MessagesRemovedEvent): Promise<RequestEvent[]> {
  const { card } = event
  const thread = await ctx.db.findThread(card)
  if (thread === undefined) return []

  const socialId = ctx.account.primarySocialId

  return event.messages.flatMap(() => {
    const patchEvent: CreatePatchEvent = {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.removeReply,
      card: thread.card,
      message: thread.message,
      content: thread.thread,
      creator: socialId
    }
    const threadEvent: UpdateThreadEvent = {
      type: MessageRequestEventType.UpdateThread,
      thread: thread.thread,
      replies: 'decrement'
    }

    return [patchEvent, threadEvent]
  })
}

async function onFileCreated(ctx: TriggerCtx, event: FileCreatedEvent): Promise<RequestEvent[]> {
  const message = (await ctx.db.findMessages({ card: event.card, id: event.file.message, limit: 1 }))[0]
  if (message !== undefined) return []

  const { file } = event
  const patchContent: Omit<File, 'card' | 'message' | 'created' | 'creator'> = {
    blobId: file.blobId,
    type: file.type,
    filename: file.filename,
    size: file.size
  }

  return [
    {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.addFile,
      card: event.card,
      message: file.message,
      content: JSON.stringify(patchContent),
      creator: file.creator
    }
  ]
}

async function onFileRemoved(ctx: TriggerCtx, event: FileRemovedEvent): Promise<RequestEvent[]> {
  const message = (await ctx.db.findMessages({ card: event.card, id: event.message, limit: 1 }))[0]
  if (message !== undefined) return []
  const { blobId } = event

  return [
    {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.removeFile,
      card: event.card,
      message: event.message,
      content: JSON.stringify({ blobId }),
      creator: event.creator
    }
  ]
}

async function registerCard(ctx: TriggerCtx, event: MessageCreatedEvent | PatchCreatedEvent): Promise<RequestEvent[]> {
  const { workspace, metadata } = ctx
  let card: CardID
  switch (event.type) {
    case MessageResponseEventType.MessageCreated:
      card = event.message.card
      break
    case MessageResponseEventType.PatchCreated:
      card = event.card
      break
  }
  if (ctx.registeredCards.has(card) || metadata.msg2fileUrl === '') return []

  try {
    const token = generateToken(systemAccountUuid, workspace)
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

async function addCollaborators(ctx: TriggerCtx, event: MessageCreatedEvent): Promise<RequestEvent[]> {
  const { creator } = event.message
  const account = await findAccount(ctx, creator)

  if (account === undefined) return []

  return [
    {
      type: NotificationRequestEventType.AddCollaborators,
      card: event.message.card,
      cardType: event.cardType,
      collaborators: [account],
      date: event.message.created
    }
  ]
}

async function addThreadReply(ctx: TriggerCtx, event: MessageCreatedEvent): Promise<RequestEvent[]> {
  const { message } = event
  const thread = await ctx.db.findThread(message.card)
  if (thread === undefined) return []

  return [
    {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.addReply,
      card: thread.card,
      message: thread.message,
      content: thread.thread,
      creator: message.creator
    },
    {
      type: MessageRequestEventType.UpdateThread,
      thread: thread.thread,
      lastReply: event.message.created,
      replies: 'increment'
    }
  ]
}

const triggers: Triggers = [
  ['add_collaborators_on_message_created', MessageResponseEventType.MessageCreated, addCollaborators as TriggerFn],
  ['add_thread_reply_on_message_created', MessageResponseEventType.MessageCreated, addThreadReply as TriggerFn],
  ['register_card_on_message_created', MessageResponseEventType.MessageCreated, registerCard as TriggerFn],
  ['register_card_on_patch_created', MessageResponseEventType.PatchCreated, registerCard as TriggerFn],
  ['on_messages_group_created', MessageResponseEventType.MessagesGroupCreated, onMessagesGroupCreated as TriggerFn],
  ['remove_reply_on_messages_removed', MessageResponseEventType.MessagesRemoved, onMessagesRemoved as TriggerFn],
  ['on_file_created', MessageResponseEventType.FileCreated, onFileCreated as TriggerFn],
  ['on_file_removed', MessageResponseEventType.FileRemoved, onFileRemoved as TriggerFn]
]

export default triggers
