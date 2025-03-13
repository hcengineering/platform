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
  MessagesGroup
} from '@hcengineering/communication-types'
import { RestClient } from '@hcengineering/api-client'
import cardPlugin, { type Card } from '@hcengineering/card'
import yaml from 'js-yaml'
import { v4 as uuid } from 'uuid'
import { RequestEventType } from '@hcengineering/communication-sdk-types'
import { retry } from '@hcengineering/communication-shared'
import { StorageAdapter } from '@hcengineering/server-core'

import { PostgresDB, SyncRecord } from './db'
import config from './config'
import { parseFileStream, toFileMessage } from './parser'
import { applyPatches } from './utils'
import { connectPlatform } from './platform'

export async function register (workspace: WorkspaceID, card: CardID, db: PostgresDB): Promise<void> {
  await db.creteRecord(workspace, card)
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
    await msg2file(ctx, record.workspace, record.card, storage)
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
  storage: StorageAdapter
): Promise<void> {
  const client = await connectPlatform(workspace)
  // TODO: FIXME
  const card = await client.findOne<Card>(cardPlugin.class.Card, { _id: cardId as any })

  if (card === undefined) {
    ctx.error('Card not found, skip processing', { workspace, card: cardId })
    return
  }

  await applyPatchesToGroups(ctx, client, workspace, card, storage)
  await newMessages2file(ctx, client, workspace, card, storage)
}

async function applyPatchesToGroups (
  ctx: MeasureContext,
  client: RestClient,
  workspace: WorkspaceID,
  card: Card,
  storage: StorageAdapter
): Promise<void> {
  let groups = await client.findGroups({ card: card._id, withPatches: true, limit: 100, order: SortingOrder.Ascending })

  while (groups.length > 0) {
    for (const group of groups) {
      await applyPatchesToGroup(ctx, client, storage, workspace, group)
    }
    groups = await client.findGroups({
      card: card._id,
      withPatches: true,
      limit: 100,
      order: SortingOrder.Ascending,
      fromDate: {
        greater: groups[groups.length - 1].toDate
      }
    })
  }
}

async function applyPatchesToGroup (
  ctx: MeasureContext,
  client: RestClient,
  storage: StorageAdapter,
  workspace: WorkspaceID,
  group: MessagesGroup
): Promise<void> {
  if (group.patches == null || group.patches.length === 0) {
    return
  }

  try {
    const file = await retry(() => storage.get(ctx, { uuid: workspace } as any, group.blobId), { retries: 3 })
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
    const blob = await uploadFile(ctx, storage, workspace, parsedFile.metadata, updatedMessages)
    await storage.remove(ctx, { uuid: workspace } as any, [group.blobId])
    await removeGroup(client, group.card, group.blobId)
    await createGroup(
      client,
      group.card,
      blob,
      parsedFile.metadata.fromDate,
      parsedFile.metadata.toDate,
      group.fromId,
      group.toId,
      updatedMessages.length
    )
  } catch (error) {
    ctx.error('Failed to apply patches', { group, error })
  }
}

async function newMessages2file (
  ctx: MeasureContext,
  client: RestClient,
  workspace: WorkspaceID,
  card: Card,
  storage: StorageAdapter
): Promise<void> {
  while (true) {
    const messages = (
      await client.findMessages({ card: card._id, order: SortingOrder.Ascending, limit: config.MessagesPerFile })
    ).map(toFileMessage)

    if (messages.length === 0) {
      break
    }

    const firstMessage = messages[0]
    const lastMessage = messages[messages.length - 1]
    const fromDate = firstMessage.created
    const toDate = lastMessage.created

    const metadata: FileMetadata = {
      card: card._id,
      title: card.title,
      fromDate,
      toDate
    }

    const blob = await uploadFile(ctx, storage, workspace, metadata, messages)
    await createGroup(client, card._id, blob, fromDate, toDate, firstMessage.id, lastMessage.id, messages.length)

    await removeMessages(client, card._id, firstMessage.id, lastMessage.id)
    await removePatches(client, card._id, firstMessage.id, lastMessage.id)
  }
}

async function createGroup (
  client: RestClient,
  card: CardID,
  blobId: Ref<Blob>,
  fromDate: Date,
  toDate: Date,
  fromId: MessageID,
  toId: MessageID,
  count: number
): Promise<void> {
  await retry(
    async () =>
      await client.event({
        type: RequestEventType.CreateMessagesGroup,
        group: {
          card,
          blobId,
          fromDate,
          toDate,
          fromId,
          toId,
          count
        }
      }),
    { retries: 3 }
  )
}

async function removeGroup (client: RestClient, card: CardID, blobId: Ref<Blob>): Promise<void> {
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

async function removeMessages (client: RestClient, card: CardID, fromId: MessageID, toId: MessageID): Promise<void> {
  await retry(
    async () =>
      await client.event({
        type: RequestEventType.RemoveMessages,
        card,
        fromId,
        toId
      }),
    { retries: 3 }
  )
}

async function removePatches (client: RestClient, card: Ref<Card>, fromId: MessageID, toId: MessageID): Promise<void> {
  await retry(
    async () =>
      await client.event({
        type: RequestEventType.RemovePatches,
        card,
        fromId,
        toId
      }),
    { retries: 3 }
  )
}

async function uploadFile (
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

  await retry(async () => await storage.put(ctx, { uuid: workspace } as any, blobId, yamlContent, 'text/yaml'), {
    retries: 3
  })

  return blobId
}
