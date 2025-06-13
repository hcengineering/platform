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
  type BlobAttachedEvent,
  type BlobDetachedEvent,
  type MessageCreatedEvent,
  MessageRequestEventType,
  MessageResponseEventType,
  type MessagesGroupCreatedEvent,
  NotificationRequestEventType,
  PatchCreatedEvent,
  type RequestEvent,
  type ThreadAttachedEvent
} from '@hcengineering/communication-sdk-types'
import {
  type AttachBlobPatchData,
  type CardID,
  type Message,
  MessageType,
  PatchType
} from '@hcengineering/communication-types'
import { generateToken } from '@hcengineering/server-token'
import { type AccountUuid, concatLink, systemAccountUuid } from '@hcengineering/core'
import { extractReferences } from '@hcengineering/text-core'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { generateMessageId } from '@hcengineering/communication-cockroach'

import type { TriggerCtx, TriggerFn, Triggers } from '../types'
import { findAccount } from '../utils'
import { findMessageInFiles } from './utils'

async function onMessagesGroupCreated (ctx: TriggerCtx, event: MessagesGroupCreatedEvent): Promise<RequestEvent[]> {
  ctx.registeredCards.delete(event.group.cardId)
  return []
}

async function onMessageRemoved (ctx: TriggerCtx, event: PatchCreatedEvent): Promise<RequestEvent[]> {
  if (event.patch.type !== PatchType.remove) return []
  const { cardId } = event
  const thread = await ctx.db.findThread(cardId)
  if (thread === undefined) return []

  const result: RequestEvent[] = []

  if (!(await ctx.db.isMessageInDb(thread.cardId, thread.messageId))) {
    result.push({
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.updateThread,
      cardId: thread.cardId,
      messageId: thread.messageId,
      data: { threadId: thread.threadId, threadType: thread.threadType, repliesCountOp: 'decrement' },
      socialId: event.patch.creator,
      date: event.patch.created
    })
  }

  result.push({
    type: MessageRequestEventType.UpdateThread,
    cardId: thread.cardId,
    messageId: thread.messageId,
    threadId: thread.threadId,
    updates: {
      repliesCountOp: 'decrement'
    },
    date: event.patch.created,
    socialId: event.patch.creator
  })

  return result
}

async function onBlobAttached (ctx: TriggerCtx, event: BlobAttachedEvent): Promise<RequestEvent[]> {
  const inDb = await ctx.db.isMessageInDb(event.cardId, event.messageId)
  if (inDb) return []

  const { blob } = event
  const patchData: AttachBlobPatchData = {
    blobId: blob.blobId,
    contentType: blob.contentType,
    fileName: blob.fileName,
    size: blob.size,
    metadata: blob.metadata
  }

  return [
    {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.attachBlob,
      cardId: event.cardId,
      messageId: event.messageId,
      data: patchData,
      socialId: blob.creator,
      date: blob.created
    }
  ]
}

async function onBlobDetached (ctx: TriggerCtx, event: BlobDetachedEvent): Promise<RequestEvent[]> {
  const inDb = await ctx.db.isMessageInDb(event.cardId, event.messageId)
  if (inDb) return []
  const { blobId } = event

  return [
    {
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.detachBlob,
      cardId: event.cardId,
      messageId: event.messageId,
      data: { blobId },
      socialId: event.socialId,
      date: event.date
    }
  ]
}

async function registerCard (ctx: TriggerCtx, event: PatchCreatedEvent): Promise<RequestEvent[]> {
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

async function addCollaborators (ctx: TriggerCtx, event: MessageCreatedEvent): Promise<RequestEvent[]> {
  const { creator, type } = event.message
  if (type === MessageType.Activity) return []
  const account = await findAccount(ctx, creator)
  const collaborators: AccountUuid[] = []

  if (account !== undefined) {
    collaborators.push(account)
  }

  const markup = markdownToMarkup(event.message.content)
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
      type: NotificationRequestEventType.AddCollaborators,
      cardId: event.message.cardId,
      cardType: event.cardType,
      collaborators,
      socialId: event.message.creator,
      date: new Date(event.message.created.getTime() - 1)
    }
  ]
}

async function addThreadReply (ctx: TriggerCtx, event: MessageCreatedEvent): Promise<RequestEvent[]> {
  if (event.message.type !== MessageType.Message || ctx.derived) {
    return []
  }
  const { message } = event
  const thread = await ctx.db.findThread(message.cardId)

  if (thread === undefined) return []
  const result: RequestEvent[] = []
  if (!(await ctx.db.isMessageInDb(thread.cardId, thread.messageId))) {
    result.push({
      type: MessageRequestEventType.CreatePatch,
      patchType: PatchType.updateThread,
      cardId: thread.cardId,
      messageId: thread.messageId,
      data: { threadId: thread.threadId, threadType: thread.threadType, repliesCountOp: 'increment' },
      socialId: event.message.creator,
      date: event.message.created
    })
  }

  result.push({
    type: MessageRequestEventType.UpdateThread,
    cardId: thread.cardId,
    messageId: thread.messageId,
    threadId: thread.threadId,
    updates: {
      lastReply: message.created,
      repliesCountOp: 'increment'
    },
    socialId: event.message.creator,
    date: message.created
  })

  return result
}

async function onThreadAttached (ctx: TriggerCtx, event: ThreadAttachedEvent): Promise<RequestEvent[]> {
  let message: Message | undefined = (
    await ctx.db.findMessages({
      card: event.thread.cardId,
      id: event.thread.messageId,
      limit: 1,
      files: true
    })
  )[0]

  const result: RequestEvent[] = []
  if (message === undefined) {
    message = await findMessageInFiles(
      ctx.db,
      ctx.metadata.filesUrl,
      ctx.workspace,
      event.thread.cardId,
      event.thread.messageId
    )

    if (message !== undefined) {
      result.push({
        type: MessageRequestEventType.CreatePatch,
        patchType: PatchType.updateThread,
        cardId: event.thread.cardId,
        messageId: event.thread.messageId,
        data: { threadId: event.thread.threadId, threadType: event.thread.threadType },
        socialId: message.creator,
        date: message.created
      })
    }
  }

  if (message === undefined || message.type === MessageType.Activity || message.extra?.threadRoot === true) {
    return []
  }

  const messageId = generateMessageId(true)

  result.push({
    messageId,
    type: MessageRequestEventType.CreateMessage,
    messageType: message.type,
    cardId: event.thread.threadId,
    cardType: event.thread.threadType,
    content: message.content,
    extra: { ...message.extra, threadRoot: true },
    socialId: message.creator,
    date: message.created
  })

  for (const blob of message.blobs) {
    result.push({
      type: MessageRequestEventType.AttachBlob,
      cardId: event.thread.threadId,
      messageId,
      blobData: {
        blobId: blob.blobId,
        contentType: blob.contentType,
        fileName: blob.fileName,
        size: blob.size,
        metadata: blob.metadata
      },
      socialId: blob.creator,
      date: blob.created
    })
  }

  return result
}

const triggers: Triggers = [
  ['add_collaborators_on_message_created', MessageResponseEventType.MessageCreated, addCollaborators as TriggerFn],
  ['add_thread_reply_on_message_created', MessageResponseEventType.MessageCreated, addThreadReply as TriggerFn],
  ['register_card_on_message_created', MessageResponseEventType.MessageCreated, registerCard as TriggerFn],
  ['register_card_on_patch', MessageResponseEventType.PatchCreated, registerCard as TriggerFn],
  ['on_messages_group_created', MessageResponseEventType.MessagesGroupCreated, onMessagesGroupCreated as TriggerFn],
  ['remove_reply_on_messages_removed', MessageResponseEventType.PatchCreated, onMessageRemoved as TriggerFn],
  ['on_thread_created', MessageResponseEventType.ThreadAttached, onThreadAttached as TriggerFn],
  ['on_blob_attached', MessageResponseEventType.BlobAttached, onBlobAttached as TriggerFn],
  ['on_blob_detached', MessageResponseEventType.BlobDetached, onBlobDetached as TriggerFn]
]

export default triggers
