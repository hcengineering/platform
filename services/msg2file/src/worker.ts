//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { MeasureContext, RateLimiter, Ref, Blob, groupByArray } from '@hcengineering/core'
import {
  type CardID,
  type FileMessage,
  type FileMetadata,
  type MessageID,
  type WorkspaceID,
  SortingOrder,
  type Message,
  MessagesGroup,
  BlobID
} from '@hcengineering/communication-types'
import cardPlugin, { type Card } from '@hcengineering/card'
import yaml from 'js-yaml'
import { v4 as uuid } from 'uuid'
import { RequestEventType } from '@hcengineering/communication-sdk-types'
import { retry } from '@hcengineering/communication-shared'
import { StorageAdapter } from '@hcengineering/server-core'
import { deserializeMessage } from '@hcengineering/communication-yaml'
import { RestClient as CommunicationRestClient } from '@hcengineering/communication-rest-client'

import { PostgresDB, SyncRecord } from './db'
import config from './config'
import { parseFileStream } from './parser'
import { applyPatches } from './utils'
import { connectCommunication, connectPlatform } from './platform'
import { getFile, removeFile, uploadFile } from './storage'

export async function register (workspace: WorkspaceID, card: CardID, db: PostgresDB): Promise<void> {
  await db.createRecord(workspace, card)
}

export async function job (ctx: MeasureContext, storage: StorageAdapter, db: PostgresDB): Promise<void> {
  ctx.info('Job started', { date: new Date() })

  const start = new Date()

  try {
    const rateLimiter = new RateLimiter(10)

    while (true) {
      const records = await db.getRecords(100, start)
      if (records.length === 0) {
        break
      }

      for (const record of records) {
        await rateLimiter.add(async () => {
          await ctx.with(
            'process',
            {
              workspace: record.workspace,
              card: record.card,
              attempt: record.attempt
            },
            async () => {
              await processRecord(ctx, record, db, storage)
            }
          )
        })
      }
      await rateLimiter.waitProcessing()
    }
  } finally {
    ctx.info('Job finished', { date: new Date() })
  }
}

async function processRecord (
  ctx: MeasureContext,
  record: SyncRecord,
  db: PostgresDB,
  storage: StorageAdapter
): Promise<void> {
  try {
    ctx.info('Start processing record', { workspace: record.workspace, card: record.card, attempt: record.attempt })
    await msg2file(ctx, record.workspace, record.card, storage, db)
    await db.removeRecord(record.workspace, record.card)
  } catch (e) {
    ctx.error('Failed to process record', { workspace: record.workspace, card: record.card, err: e })
    if (record.attempt < config.MaxSyncAttempts) {
      await db.increaseAttempt(record.workspace, record.card)
    } else {
      await db.removeRecord(record.workspace, record.card)
    }
  }
}

async function msg2file (
  ctx: MeasureContext,
  workspace: WorkspaceID,
  cardId: CardID,
  storage: StorageAdapter,
  db: PostgresDB
): Promise<void> {
  ctx.info('Processing card', { card: cardId })
  const platformClient = await connectPlatform(workspace)
  const card = await platformClient.findOne<Card>(cardPlugin.class.Card, { _id: cardId as Ref<Card> })

  if (card === undefined) {
    ctx.error('Card not found, skip processing', { workspace, card: cardId })
    return
  }
  const client = await connectCommunication(workspace)

  await applyPatchesToGroups(ctx, client, workspace, card, storage, db)
  await newMessages2file(ctx, client, workspace, card, storage, db)
}

async function applyPatchesToGroups (
  ctx: MeasureContext,
  client: CommunicationRestClient,
  workspace: WorkspaceID,
  card: Card,
  storage: StorageAdapter,
  db: PostgresDB
): Promise<void> {
  let groups = await client.findMessagesGroups({
    card: card._id,
    patches: true,
    limit: 100,
    order: SortingOrder.Ascending
  })
  let firstBlobId: BlobID | undefined
  while (groups.length > 0) {
    if (firstBlobId === groups[0].blobId) {
      ctx.error('Group is repeated', { group: groups[0].blobId })
      throw new Error(`Group is repeated ${groups[0].blobId}`)
    }
    firstBlobId = groups[0].blobId
    for (const group of groups) {
      await applyPatchesToGroup(ctx, client, storage, workspace, group, db, card._id)
    }
    groups = await client.findMessagesGroups({
      card: card._id,
      patches: true,
      limit: 100,
      order: SortingOrder.Ascending,
      fromSec: {
        greater: groups[groups.length - 1].toSec
      }
    })
  }
}

async function applyPatchesToGroup (
  ctx: MeasureContext,
  client: CommunicationRestClient,
  storage: StorageAdapter,
  workspace: WorkspaceID,
  group: MessagesGroup,
  db: PostgresDB,
  card: CardID
): Promise<void> {
  if (group.patches == null || group.patches.length === 0) {
    return
  }

  ctx.info('Start apply patches to group', { group: group.blobId, patches: group.patches.length })
  try {
    const file = await getFile(storage, ctx, workspace, group.blobId)
    const parsedFile = await parseFileStream(file)
    const patchesByMessage = groupByArray(group.patches, (it) => it.message)
    const updatedMessages: Message[] = parsedFile.messages.map((message) => {
      const patches = patchesByMessage.get(message.id) ?? []
      if (patches.length === 0) {
        return message
      } else {
        return applyPatches(message, patches)
      }
    })
    const blob = await uploadGroupFile(ctx, storage, workspace, parsedFile.metadata, updatedMessages)
    await createGroup(
      client,
      group.card,
      blob,
      parsedFile.metadata.fromDate,
      parsedFile.metadata.toDate,
      updatedMessages.length
    )
    await removeGroup(client, group.card, group.blobId)
    await removePatches(db, workspace, card, Array.from(patchesByMessage.keys()))
    await removeFile(storage, ctx, workspace, group.blobId)
  } catch (error) {
    ctx.error('Failed to apply patches', { group, error })
  }
}

async function newMessages2file (
  ctx: MeasureContext,
  client: CommunicationRestClient,
  workspace: WorkspaceID,
  card: Card,
  storage: StorageAdapter,
  db: PostgresDB
): Promise<void> {
  const lastGroup = (
    await client.findMessagesGroups({
      card: card._id,
      orderBy: 'toSec',
      order: SortingOrder.Descending,
      limit: 1
    })
  )[0]

  let firstMessageId: MessageID | undefined

  while (true) {
    const messages = (
      await client.findMessages({
        card: card._id,
        order: SortingOrder.Ascending,
        limit: config.MessagesPerFile,
        reactions: true,
        replies: true,
        files: true
      })
    ).map(deserializeMessage)

    if (messages.length === 0) {
      break
    }

    if (firstMessageId === messages[0].id) {
      ctx.error('Message repeated', { card: card._id, message: firstMessageId })
      throw new Error(`Message repeated ${firstMessageId}`)
    }

    firstMessageId = messages[0].id

    const firstMessage = messages[0]
    const fromDate = firstMessage.created
    const fromSec = new Date(fromDate).setMilliseconds(0)

    const messagesFromExistingGroup =
      lastGroup == null || fromSec > lastGroup.toSec.getTime()
        ? []
        : messages.filter(({ created }) => new Date(created).setMilliseconds(0) <= lastGroup.toSec.getTime())
    const newMessages =
      messagesFromExistingGroup.length > 0 ? messages.slice(messagesFromExistingGroup.length) : messages

    await pushMessagesToExistingGroup(client, card, messagesFromExistingGroup, ctx, storage, workspace)
    const savedMessages = await createNewGroup(client, card, newMessages, ctx, storage, workspace)

    const ids = [...messagesFromExistingGroup, ...savedMessages].map((it) => it.id)
    await removeMessages(db, workspace, card._id, ids)
    await removePatches(db, workspace, card._id, ids)
  }
}

async function createNewGroup (
  client: CommunicationRestClient,
  card: Card,
  messages: FileMessage[],
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspace: WorkspaceID
): Promise<FileMessage[]> {
  if (messages.length === 0) return []

  const lastMessage = messages[messages.length - 1]
  const to = new Date(lastMessage.created)
  to.setMilliseconds(999)

  const messagesFromRange = (
    await client.findMessages({
      card: card._id,
      order: SortingOrder.Ascending,
      created: {
        greaterOrEqual: lastMessage.created,
        lessOrEqual: to
      },
      reactions: true,
      replies: true,
      files: true
    })
  )
    .filter((it) => it.id !== lastMessage.id)
    .map(deserializeMessage)

  const allMessages = messages.concat(messagesFromRange)
  const metadata: FileMetadata = {
    card: card._id,
    title: card.title,
    fromDate: allMessages[0].created,
    toDate: allMessages[allMessages.length - 1].created
  }
  const blob = await uploadGroupFile(ctx, storage, workspace, metadata, allMessages)
  await createGroup(client, card._id, blob, metadata.fromDate, metadata.toDate, allMessages.length)

  return allMessages
}

async function pushMessagesToExistingGroup (
  client: CommunicationRestClient,
  card: Card,
  messages: FileMessage[],
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspace: WorkspaceID
): Promise<void> {
  if (messages.length === 0) return
  ctx.warn('Push messages to existing group', {
    firstId: messages[0].id,
    lastId: messages[messages.length - 1].id,
    count: messages.length
  })

  while (true) {
    const message = messages[0]
    if (message == null) break
    const group = await findTargetGroup(client, card._id, message.created)
    if (group == null) {
      ctx.error('Failed to find group for message', { card: card._id, message: message.id })
      throw new Error('Failed to find group for message ' + message.id)
    }

    const messagesFromGroup = messages.filter((it) => {
      const date = new Date(it.created)
      date.setMilliseconds(0)
      return date <= group.toSec && date >= group.fromSec
    })

    messages.splice(0, messagesFromGroup.length)

    await pushMessagesToGroup(client, group, messagesFromGroup, ctx, storage, workspace)
  }
}

async function pushMessagesToGroup (
  client: CommunicationRestClient,
  group: MessagesGroup,
  messages: FileMessage[],
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspace: WorkspaceID
): Promise<void> {
  try {
    const file = await getFile(storage, ctx, workspace, group.blobId)
    const parsedFile = await parseFileStream(file)

    const newMessages = parsedFile.messages
      .map(deserializeMessage)
      .concat(messages)
      .sort((a, b) => a.created.getTime() - b.created.getTime())
    const blob = await uploadGroupFile(ctx, storage, workspace, parsedFile.metadata, newMessages)
    await removeFile(storage, ctx, workspace, group.blobId)
    await removeGroup(client, group.card, group.blobId)
    await createGroup(
      client,
      group.card,
      blob,
      parsedFile.metadata.fromDate,
      parsedFile.metadata.toDate,
      newMessages.length
    )
  } catch (err: any) {
    ctx.error('Failed to push messages to group', { group: group.blobId, error: err })
    throw err
  }
}

async function createGroup (
  client: CommunicationRestClient,
  card: CardID,
  blobId: Ref<Blob>,
  fromSec: Date,
  toSec: Date,
  count: number
): Promise<void> {
  await retry(
    async () =>
      await client.event({
        type: RequestEventType.CreateMessagesGroup,
        group: {
          card,
          blobId,
          fromSec,
          toSec,
          count
        }
      }),
    { retries: 3 }
  )
}

async function removeGroup (client: CommunicationRestClient, card: CardID, blobId: Ref<Blob>): Promise<void> {
  await retry(
    async () =>
      await client.event({
        type: RequestEventType.RemoveMessagesGroup,
        card,
        blobId
      }),
    { retries: 3 }
  )
}

async function removeMessages (db: PostgresDB, workspace: WorkspaceID, card: CardID, ids: MessageID[]): Promise<void> {
  while (ids.length > 0) {
    const chunk = ids.splice(0, 100)
    await retry(
      async () => {
        await db.removeMessages(workspace, card, chunk)
      },
      { retries: 3 }
    )
  }
}

async function removePatches (db: PostgresDB, workspace: WorkspaceID, card: CardID, ids: MessageID[]): Promise<void> {
  while (ids.length > 0) {
    const chunk = ids.splice(0, 100)
    await retry(
      async () => {
        await db.removePatches(workspace, card, chunk)
      },
      { retries: 3 }
    )
  }
}

async function uploadGroupFile (
  ctx: MeasureContext,
  storage: StorageAdapter,
  workspace: WorkspaceID,
  metadata: FileMetadata,
  messages: FileMessage[]
): Promise<Ref<Blob>> {
  const yamlMetadata = yaml.dump(metadata, { noRefs: true }).trim()
  const yamlMessages = yaml.dump(messages, { noRefs: true, indent: 0 }).trim()
  const yamlContent = `---\n${yamlMetadata}\n---\n${yamlMessages}`

  const blobId = uuid() as Ref<Blob>

  await uploadFile(storage, ctx, workspace, blobId, yamlContent)

  return blobId
}

async function findTargetGroup (
  client: CommunicationRestClient,
  card: CardID,
  created: Date
): Promise<MessagesGroup | undefined> {
  const date = new Date(created)
  date.setMilliseconds(0)
  return (
    await client.findMessagesGroups({
      card,
      fromSec: { lessOrEqual: date },
      toSec: { greaterOrEqual: date },
      limit: 1,
      order: SortingOrder.Ascending,
      orderBy: 'fromSec'
    })
  )[0]
}
