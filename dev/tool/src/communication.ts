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

import { type Workspace } from '@hcengineering/account'
import { type HulylakeClient, type JsonPatch } from '@hcengineering/hulylake-client'
import type postgres from 'postgres'
import { type StorageAdapter } from '@hcengineering/server-core'
import {
  generateUuid,
  groupByArray,
  type MeasureContext,
  notEmpty,
  type PersonId,
  type PersonUuid,
  type WorkspaceUuid
} from '@hcengineering/core'
import {
  type Attachment,
  type AttachmentData,
  type AttachmentDoc,
  type AttachmentID,
  type AttachmentUpdateData,
  type BlobID,
  type CardID,
  type CardType,
  type Emoji,
  linkPreviewType,
  type Markdown,
  type MessageDoc,
  type MessageExtra,
  type MessageID,
  type MessagesDoc,
  type MessagesGroup,
  type MessagesGroupDoc,
  type MessagesGroupsDoc,
  MessageType,
  type SocialID,
  type ThreadDoc
} from '@hcengineering/communication-types'
import yaml from 'js-yaml'
import { type AccountClient } from '@hcengineering/account-client'

const MAX_MESSAGES_SIZE = 95 * 1024

const MESSAGES_GROUP_TABLE = 'communication.messages_group'
const MESSAGES_TABLE = 'communication.message'
const PATCH_TABLE = 'communication.patch'
const ATTACHMENT_TABLE = 'communication.attachment'
const REACTION_TABLE = 'communication.reaction'
const THREAD_INDEX_TABLE = 'communication.thread_index'

export async function migrateWorkspaceMessages (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  storage: StorageAdapter,
  hulylake: HulylakeClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>
): Promise<void> {
  const initializedCards = new Set<CardID>()

  await migrateMessagesGroups(ctx, ws, db, storage, hulylake, accountClient, personUuidBySocialId, initializedCards)
  await migrateMessages(ctx, ws, db, hulylake, accountClient, personUuidBySocialId, initializedCards)
}

async function migrateMessages (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  hulylake: HulylakeClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  initializedCards: Set<CardID>
): Promise<void> {
  const cards = await getMessagesCards(ws.uuid, db)

  for (const card of cards) {
    try {
      if (!initializedCards.has(card)) {
        await initializeCardGroups(ctx, ws, hulylake, card)
        initializedCards.add(card)
      }

      ctx.info(`Migrating messages for card ${card}`)
      const cursor = getMessagesCursor(ws.uuid, card, db)

      for await (const messages of cursor) {
        if (messages.length === 0) continue
        const oldMessages = messages.map(deserializeOldMessage).filter(notEmpty)
        await migrateMessagesBatch(card, hulylake, accountClient, personUuidBySocialId, oldMessages)
      }
    } catch (e) {
      ctx.error('Failed to migrate messages for card', card)
      ctx.error('Error', { error: e })
    }
  }
}

async function migrateMessagesBatch (
  cardId: CardID,
  hulylake: HulylakeClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  messages: OldMessage[]
): Promise<void> {
  const newMessages: MessageDoc[] = []
  for (const oldMessage of messages) {
    const newMessageDoc = await oldMessageToNewMessageDoc(oldMessage, accountClient, personUuidBySocialId)
    newMessages.push(newMessageDoc)
  }
  const chunks = chunkMessagesBySize(newMessages)
  for (const chunk of chunks) {
    const fromDate = chunk.from
    const toDate = chunk.to
    const blobId = generateUuid() as BlobID
    const newGroupDoc: MessagesGroupDoc = {
      cardId,
      blobId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      count: chunk.count
    }
    const newMessagesDoc: MessagesDoc = {
      cardId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      messages: chunk.chunk,
      language: 'original'
    }

    const jsonPatches: JsonPatch[] = [
      {
        hop: 'add',
        path: `/${blobId}`,
        value: newGroupDoc,
        safe: true
      } as const
    ]

    await hulylake.patchJson(`${cardId}/messages/groups`, jsonPatches, undefined, {
      maxRetries: 3,
      isRetryable: () => true,
      delayStrategy: {
        getDelay: () => 1000
      }
    })
    await hulylake.putJson(`${cardId}/messages/${blobId}`, newMessagesDoc, undefined, {
      maxRetries: 3,
      isRetryable: () => true,
      delayStrategy: {
        getDelay: () => 1000
      }
    })
  }
}

async function migrateMessagesGroups (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  storage: StorageAdapter,
  hulylake: HulylakeClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  initializedCards: Set<CardID>
): Promise<void> {
  const cursor = getMessagesGroupsCursor(ws.uuid, db)

  for await (const groups of cursor) {
    for (const _g of groups) {
      const group: MessagesGroup = deserializeMessagesGroup(_g)
      try {
        if (!initializedCards.has(group.cardId)) {
          await initializeCardGroups(ctx, ws, hulylake, group.cardId)
          initializedCards.add(group.cardId)
        }

        await migrateMessagesGroup(ctx, ws, db, group, storage, hulylake, accountClient, personUuidBySocialId)
      } catch (e) {
        ctx.error('Failed to migrate messages group', group)
        ctx.error('error', { error: e })
      }
    }
  }
}

async function initializeCardGroups (
  ctx: MeasureContext,
  ws: Workspace,
  hulylake: HulylakeClient,
  cardId: CardID
): Promise<void> {
  const res = await hulylake.getJson<MessagesGroupsDoc>(`${cardId}/messages/groups`, {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 500
    }
  })

  if (res.body != null) return

  await hulylake.putJson(`${cardId}/messages/groups`, {}, undefined, {
    maxRetries: 3,
    isRetryable: () => true,
    delayStrategy: {
      getDelay: () => 1000
    }
  })
}

async function migrateMessagesGroup (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  group: MessagesGroup,
  storage: StorageAdapter,
  hulylake: HulylakeClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>
): Promise<void> {
  const patches = await findMessageGroupPatches(ws.uuid, db, group)
  const parsedBlob = await loadMessagesGroupBlob(ctx, ws, group, storage, patches)

  if (parsedBlob == null) return

  const oldMessages = parsedBlob.messages
  const newMessages: MessageDoc[] = []

  for (const oldMessage of oldMessages) {
    const newMessage = await oldMessageToNewMessageDoc(oldMessage, accountClient, personUuidBySocialId)
    newMessages.push(newMessage)
  }

  const chunks = chunkMessagesBySize(newMessages)

  let i = 0
  for (const chunk of chunks) {
    const blobId = i === 0 ? group.blobId : (generateUuid() as BlobID)
    const newGroupDoc: MessagesGroupDoc = {
      cardId: group.cardId,
      blobId,
      fromDate: chunk.from.toISOString(),
      toDate: chunk.to.toISOString(),
      count: chunk.count
    }
    const newMessagesDoc: MessagesDoc = {
      cardId: group.cardId,
      fromDate: chunk.from.toISOString(),
      toDate: chunk.to.toISOString(),
      messages: chunk.chunk,
      language: 'original'
    }
    const jsonPatches: JsonPatch[] = [
      {
        hop: 'add',
        path: `/${blobId}`,
        value: newGroupDoc,
        safe: true
      } as const
    ]

    await hulylake.patchJson(`${group.cardId}/messages/groups`, jsonPatches, undefined, {
      maxRetries: 3,
      isRetryable: () => true,
      delayStrategy: {
        getDelay: () => 1000
      }
    })
    await hulylake.putJson(`${group.cardId}/messages/${blobId}`, newMessagesDoc, undefined, {
      maxRetries: 3,
      isRetryable: () => true,
      delayStrategy: {
        getDelay: () => 1000
      }
    })
    i++
  }
}

function chunkMessagesBySize (
  messages: MessageDoc[]
): Array<{ chunk: Record<MessageID, MessageDoc>, from: Date, to: Date, count: number }> {
  const chunks: Array<{ chunk: Record<MessageID, MessageDoc>, from: Date, to: Date, count: number }> = []

  let current: { chunk: Record<MessageID, MessageDoc>, from?: Date, to?: Date, count: number } = {
    chunk: {},
    count: 0
  }

  for (const msg of messages) {
    current.chunk[msg.id] = msg

    if (sizeOfJson(current.chunk) <= MAX_MESSAGES_SIZE) {
      const d = new Date(msg.created)
      current.count += 1
      current.from = current.from != null ? (d < current.from ? d : current.from) : d
      current.to = current.to != null ? (d > current.to ? d : current.to) : d
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete current.chunk[msg.id]

    if (sizeOfJson(msg) > MAX_MESSAGES_SIZE) {
      console.warn('Message size is too big, skipping')
      continue
    }

    if (Object.keys(current.chunk).length === 0) {
      console.warn('Message size is too big, skipping')
      continue
    }

    if (current.from != null && current.to != null) {
      chunks.push({
        chunk: current.chunk,
        from: current.from,
        to: current.to,
        count: current.count
      })
    }

    current = {
      chunk: {},
      count: 0
    }
    current.chunk[msg.id] = msg

    if (sizeOfJson(current.chunk) <= MAX_MESSAGES_SIZE) {
      const d = new Date(msg.created)
      current.from = current.from != null ? (d < current.from ? d : current.from) : d
      current.to = current.to != null ? (d > current.to ? d : current.to) : d
      current.count = 1
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete current.chunk[msg.id]
      console.warn(`Message ${msg.id} still exceeds limit, skipping`)
    }
  }

  if (current.from != null && current.to != null) {
    chunks.push({
      chunk: current.chunk,
      from: current.from,
      to: current.to,
      count: current.count
    })
  }

  return chunks
}

async function oldMessageToNewMessageDoc (
  oldMessage: OldMessage,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>
): Promise<MessageDoc> {
  const reactions: Record<Emoji, Record<PersonUuid, { count: number, date: string }>> = {}
  const attachments: Record<AttachmentID, AttachmentDoc> = {}
  const threads: Record<CardID, ThreadDoc> = {}

  const reactionsByEmoji = groupByArray(oldMessage.reactions, (it) => it.reaction)
  for (const [_emoji, oldReactions] of reactionsByEmoji.entries()) {
    const emoji = _emoji as Emoji
    if (reactions[emoji] == null) {
      reactions[emoji] = {}
    }
    for (const oldReaction of oldReactions) {
      const personUuid = await getPersonUuidBySocialId(accountClient, personUuidBySocialId, oldReaction.creator)

      if (personUuid == null) continue
      if (reactions[emoji][personUuid] == null) {
        reactions[emoji][personUuid] = {
          count: 1,
          date: oldReaction.created.toISOString()
        }
      }
    }
  }

  for (const oldAttachment of oldMessage.attachments) {
    attachments[oldAttachment.id] = {
      id: oldAttachment.id,
      mimeType:
        oldAttachment.mimeType ??
        (oldAttachment as any)?.params?.mimeType ??
        (oldAttachment as any).type ??
        (oldAttachment as any)?.params?.type ??
        '',
      params: oldAttachment.params,
      creator: oldAttachment.creator,
      created: oldAttachment.created.toISOString(),
      modified: oldAttachment.modified?.toISOString() ?? null
    }
  }

  if (oldMessage.thread != null) {
    threads[oldMessage.thread.threadId] = {
      threadId: oldMessage.thread.threadId,
      threadType: oldMessage.thread.threadType,
      repliesCount: oldMessage.thread.repliesCount,
      lastReplyDate: oldMessage.thread.lastReply?.toISOString() ?? null,
      repliedPersons: {}
    }
  }
  return {
    id: oldMessage.id,
    cardId: oldMessage.cardId,
    type: oldMessage.type === 'activity' ? MessageType.Activity : MessageType.Text,
    content: oldMessage.content,
    extra: oldMessage.extra ?? {},
    creator: oldMessage.creator,
    created: oldMessage.created.toISOString(),
    modified: oldMessage.edited?.toISOString() ?? null,
    reactions,
    attachments,
    threads
  }
}

function sizeOfJson (obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8')
}

async function getPersonUuidBySocialId (
  ccountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  socialId: PersonId
): Promise<PersonUuid | undefined> {
  if (personUuidBySocialId.has(socialId)) {
    return personUuidBySocialId.get(socialId)
  }
  const personUuid = await ccountClient.findPersonBySocialId(socialId)
  if (personUuid != null) {
    personUuidBySocialId.set(socialId, personUuid)
  }

  return personUuid
}

async function loadMessagesGroupBlob (
  ctx: MeasureContext,
  ws: Workspace,
  group: MessagesGroup,
  storage: StorageAdapter,
  patches: Patch[]
): Promise<ParsedFile | undefined> {
  try {
    const stream = await storage.get(ctx, ws, group.blobId)
    const response = new Response(stream as any)
    const text = await response.text()
    const parsedFile = parseYaml(text)

    const patchesByMessageId = groupByArray(patches, (it) => it.messageId)

    return {
      ...parsedFile,
      messages: parsedFile.messages
        .map((message) => {
          const patches = patchesByMessageId.get(message.id) ?? []
          return patches.length > 0 ? applyPatches(message, patches) : message
        })
        .filter(notEmpty)
    }
  } catch (e) {
    ctx.error('Error:', { error: e })
  }
}

async function getMessagesCards (ws: WorkspaceUuid, db: postgres.Sql): Promise<CardID[]> {
  const table = db(MESSAGES_TABLE)
  const res = await db`
      SELECT DISTINCT card_id
      FROM ${table}
      WHERE workspace_id = ${ws}
  `

  return res.map((r) => r.card_id)
}

function getMessagesGroupsCursor (ws: WorkspaceUuid, db: postgres.Sql): AsyncIterable<postgres.Row[]> {
  const table = db(MESSAGES_GROUP_TABLE)
  return db`SELECT * FROM ${table} WHERE workspace_id = ${ws} ORDER BY from_date ASC`.cursor(500)
}

function getMessagesCursor (ws: WorkspaceUuid, cardId: CardID, db: postgres.Sql): AsyncIterable<postgres.Row[]> {
  const messagesTable = db(MESSAGES_TABLE)
  const threadIndexTable = db(THREAD_INDEX_TABLE)
  const attachmentTable = db(ATTACHMENT_TABLE)
  const reactionTable = db(REACTION_TABLE)
  const patchTable = db(PATCH_TABLE)
  return db`WITH
                limited_messages AS (
                    SELECT *
                    FROM ${messagesTable} m
                    WHERE m.workspace_id = ${ws}
                      AND m.card_id = ${cardId}
                    ORDER BY m.created ASC
                ),

                agg_attachments AS (
                    SELECT
                        a.workspace_id,
                        a.card_id,
                        a.message_id,
                        jsonb_agg(jsonb_build_object(
                                'id', a.id,
                                'type', a.type,
                                'params', a.params,
                                'creator', a.creator,
                                'created', a.created,
                                'modified', a.modified
                                  )) AS attachments
                    FROM ${attachmentTable} a
                             INNER JOIN limited_messages m
                                        ON m.workspace_id = a.workspace_id
                                            AND m.card_id = a.card_id
                                            AND m.id = a.message_id
                    GROUP BY a.workspace_id, a.card_id, a.message_id
                ),

                agg_reactions AS (
                    SELECT
                        r.workspace_id,
                        r.card_id,
                        r.message_id,
                        jsonb_agg(jsonb_build_object(
                                'reaction', r.reaction,
                                'creator', r.creator,
                                'created', r.created
                                  )) AS reactions
                    FROM ${reactionTable} r
                             INNER JOIN limited_messages m
                                        ON m.workspace_id = r.workspace_id
                                            AND m.card_id = r.card_id
                                            AND m.id = r.message_id
                    GROUP BY r.workspace_id, r.card_id, r.message_id
                ),

                agg_patches AS (
                    SELECT
                        p.workspace_id,
                        p.card_id,
                        p.message_id,
                        jsonb_agg(
                                jsonb_build_object(
                                        'type', p.type,
                                        'data', p.data,
                                        'creator', p.creator,
                                        'created', p.created
                                ) ORDER BY p.created ASC
                        ) AS patches
                    FROM ${patchTable} p
                             INNER JOIN limited_messages m
                                        ON m.workspace_id = p.workspace_id
                                            AND m.card_id = p.card_id
                                            AND m.id = p.message_id
                    GROUP BY p.workspace_id, p.card_id, p.message_id
                )

            SELECT m.id::text,
                   m.card_id,
                   m.type,
                   m.content,
                   m.creator,
                   m.created,
                   m.data,
                   t.thread_id AS thread_id,
                   t.thread_type AS thread_type,
                   t.replies_count::int AS replies_count,
                   t.last_reply AS last_reply,
                   COALESCE(a.attachments, '[]'::jsonb) AS attachments,
                   COALESCE(r.reactions, '[]'::jsonb) AS reactions,
                   COALESCE(p.patches, '[]'::jsonb) AS patches
            FROM limited_messages m
                     LEFT JOIN ${threadIndexTable} t
                               ON t.workspace_id = m.workspace_id
                                   AND t.card_id = m.card_id
                                   AND t.message_id = m.id
                     LEFT JOIN agg_attachments a
                               ON a.workspace_id = m.workspace_id
                                   AND a.card_id = m.card_id
                                   AND a.message_id = m.id
                     LEFT JOIN agg_reactions r
                               ON r.workspace_id = m.workspace_id
                                   AND r.card_id = m.card_id
                                   AND r.message_id = m.id
                     LEFT JOIN agg_patches p
                               ON p.workspace_id = m.workspace_id
                                   AND p.card_id = m.card_id
                                   AND p.message_id = m.id
            ORDER BY m.created ASC;`.cursor(200)
}

async function findMessageGroupPatches (ws: WorkspaceUuid, db: postgres.Sql, group: MessagesGroup): Promise<Patch[]> {
  const table = db(PATCH_TABLE)
  const res =
    await db`SELECT * FROM ${table} WHERE workspace_id = ${ws} AND  message_created BETWEEN ${group.fromDate} AND ${group.toDate}`

  return res.map((r) => deserializePatch(r))
}

function deserializeMessagesGroup (group: any): MessagesGroup {
  return {
    cardId: group.card_id,
    blobId: group.blob_id,
    fromDate: new Date(group.from_date),
    toDate: new Date(group.to_date),
    count: Number(group.count)
  }
}

function deserializePatch (raw: any): Patch {
  return {
    type: raw.type,
    messageId: String(raw.message_id) as MessageID,
    data: raw.data,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

function deserializeOldMessage (raw: any): OldMessage | undefined {
  const patches: Patch[] = (raw.patches ?? []).map((it: any) => deserializePatch(it))
  const rawMessage: OldMessage = {
    id: String(raw.id) as MessageID,
    type: raw.type,
    cardId: raw.card_id,
    content: raw.content,
    creator: raw.creator,
    created: new Date(raw.created),
    removed: false,
    extra: raw.data,
    thread:
      raw.thread_id != null && raw.thread_type != null
        ? {
            cardId: raw.card_id,
            messageId: String(raw.id) as MessageID,
            threadId: raw.thread_id,
            threadType: raw.thread_type,
            repliesCount: raw.replies_count != null ? Number(raw.replies_count) : 0,
            lastReply: raw.last_reply ?? new Date()
          }
        : undefined,
    reactions: (raw.reactions ?? []).map(deserializeReaction),
    attachments: (raw.attachments ?? []).map(deserializeAttachment)
  }

  if (patches.length === 0) {
    return rawMessage
  }

  return applyPatches(
    rawMessage,
    patches.filter((it) => it.type === PatchType.update || it.type === PatchType.remove)
  )
}

function deserializeReaction (raw: any): OldReaction {
  return {
    reaction: raw.reaction,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

function deserializeAttachment (raw: any): Attachment {
  return {
    id: String(raw.id) as AttachmentID,
    type: raw.type,
    params: raw.params,
    creator: raw.creator,
    created: new Date(raw.created),
    modified: raw.modified != null ? new Date(raw.modified) : undefined
  } as any as Attachment
}

function parseYaml (data: string): ParsedFile {
  const [metadata, messages] = yaml.loadAll(data) as [FileMetadata, FileMessage[]]

  return {
    ...metadata,
    messages: messages.map((message) => ({
      id: message.id,
      type: message.type,
      cardId: metadata.cardId ?? (metadata as any).card,
      content: message.content,
      edited: message.edited,
      creator: message.creator,
      created: message.created,
      removed: message.removed,
      extra: message.extra ?? (message as any).data,
      thread:
        message.thread != null
          ? {
              cardId: metadata.cardId,
              messageId: message.id,
              threadId: message.thread.threadId ?? (message.thread as any).thread,
              threadType: message.thread.threadType,
              repliesCount: message.thread.repliesCount,
              lastReply: message.thread.lastReply
            }
          : undefined,
      attachments: parseAttachments(message),
      reactions: message.reactions ?? []
    }))
  }
}

function parseAttachments (message: FileMessage): Attachment[] {
  if (message.attachments != null) {
    return message.attachments
  }

  const oldMessage = message as any

  const attachments: Attachment[] = []

  if ('files' in oldMessage && Array.isArray(oldMessage.files)) {
    attachments.push(
      ...oldMessage.files.map((it: any) => ({
        id: it.blobId,
        type: it.type,
        params: {
          blobId: it.blobId,
          mimeType: it.type,
          fileName: it.filename,
          size: it.size,
          metadata: it.meta
        },
        creator: it.creator,
        created: new Date(it.created)
      }))
    )
  } else if ('blobs' in oldMessage && Array.isArray(oldMessage.blobs)) {
    attachments.push(
      ...oldMessage.blobs.map((it: any) => ({
        id: it.blobId,
        type: it.mimeType ?? it.contentType,
        params: {
          blobId: it.blobId,
          mimeType: it.mimeType ?? it.contentType,
          fileName: it.fileName,
          size: it.size,
          metadata: it.metadata
        },
        creator: it.creator,
        created: new Date(it.created)
      }))
    )
  }

  if ('linkPreviews' in oldMessage && Array.isArray(oldMessage.linkPreviews)) {
    attachments.push(
      ...oldMessage.linkPreviews.map((it: any) => ({
        id: it.previewId,
        type: linkPreviewType,
        params: it,
        creator: it.creator,
        created: new Date(it.created)
      }))
    )
  }

  return attachments
}

function applyPatches (message: OldMessage, patches: Patch[]): OldMessage | undefined {
  if (patches.length === 0) return message

  let result: OldMessage | undefined = message
  for (const p of patches) {
    result = applyPatch(message, p)
  }
  return result
}

function applyPatch (message: OldMessage, patch: Patch): OldMessage | undefined {
  if (message.removed) {
    return undefined
  }

  switch (patch.type) {
    case PatchType.update: {
      if (patch.created.getTime() < (message.edited?.getTime() ?? 0)) {
        return message
      }
      return {
        ...message,
        edited: patch.created,
        content: patch.data.content ?? message.content,
        extra: patch.data.extra ?? message.extra
      }
    }
    case PatchType.remove: {
      return undefined
    }
    case PatchType.reaction:
      return patchReactions(message, patch)
    case PatchType.attachment:
      return patchAttachments(message, patch)
    case PatchType.thread:
      return patchThread(message, patch)
  }
}

function patchAttachments (message: OldMessage, patch: AttachmentPatch): OldMessage {
  if (patch.data.operation === 'add') {
    return addAttachments(message, patch.data.attachments, patch.created, patch.creator)
  } else if (patch.data.operation === 'remove') {
    return removeAttachments(message, patch.data.ids)
  } else if (patch.data.operation === 'set') {
    return setAttachments(message, patch.data.attachments, patch.created, patch.creator)
  } else if (patch.data.operation === 'update') {
    return updateAttachments(message, patch.data.attachments, patch.created)
  }
  return message
}

function patchReactions (message: OldMessage, patch: ReactionPatch): OldMessage {
  if (patch.data.operation === 'add') {
    return setReaction(message, patch.data.reaction, patch.creator, patch.created)
  } else if (patch.data.operation === 'remove') {
    return removeReaction(message, patch.data.reaction, patch.creator)
  }
  return message
}

function setReaction (message: OldMessage, reaction: string, creator: SocialID, created: Date): OldMessage {
  const isExist = message.reactions.some((it) => it.reaction === reaction && it.creator === creator)
  if (isExist) return message
  message.reactions.push({
    reaction,
    creator,
    created
  })
  return message
}

function removeReaction (message: OldMessage, reaction: string, creator: SocialID): OldMessage {
  const reactions = message.reactions.filter((it) => it.reaction !== reaction || it.creator !== creator)
  if (reactions.length === message.reactions.length) return message

  return {
    ...message,
    reactions
  }
}

function addAttachments (message: OldMessage, data: AttachmentData[], created: Date, creator: SocialID): OldMessage {
  const newAttachments: Attachment[] = []
  for (const attach of data) {
    const isExists = message.attachments.some((it) => it.id === attach.id)
    if (isExists === undefined) continue
    const attachment: Attachment = {
      ...attach,
      created,
      creator
    } as any
    newAttachments.push(attachment)
  }

  if (newAttachments.length === 0) return message
  return {
    ...message,
    attachments: [...message.attachments, ...newAttachments]
  }
}

function updateAttachments (message: OldMessage, updates: AttachmentUpdateData[], date: Date): OldMessage {
  if (updates.length === 0) return message
  const updatedAttachments: Attachment[] = []
  for (const attachment of message.attachments) {
    const update = updates.find((it) => it.id === attachment.id)
    if (update === undefined) {
      updatedAttachments.push(attachment)
    } else {
      updatedAttachments.push({
        ...attachment,
        params: {
          ...attachment.params,
          ...update.params
        },
        modified: date.getTime() > (attachment.modified?.getTime() ?? 0) ? date : attachment.modified
      } as any)
    }
  }

  return {
    ...message,
    attachments: updatedAttachments
  }
}

function removeAttachments (message: OldMessage, ids: AttachmentID[]): OldMessage {
  const attachments = message.attachments.filter((it) => !ids.includes(it.id))
  if (attachments.length === message.attachments.length) return message

  return {
    ...message,
    attachments
  }
}

function setAttachments (message: OldMessage, data: AttachmentData[], created: Date, creator: SocialID): OldMessage {
  if (data.length === 0) return message
  return {
    ...message,
    attachments: data.map(
      (it) =>
        ({
          ...it,
          created,
          creator
        }) as any
    )
  }
}

function patchThread (message: OldMessage, patch: ThreadPatch): OldMessage {
  if (patch.data.operation === 'attach') {
    return attachThread(message, patch.data.threadId, patch.data.threadType)
  } else if (patch.data.operation === 'update') {
    return updateThread(
      message,
      patch.data.threadId,
      patch.data.threadType,
      patch.data.repliesCountOp,
      patch.data.lastReply
    )
  }
  return message
}

function attachThread (message: OldMessage, threadId: CardID, threadType: CardType): OldMessage {
  if (message.thread !== undefined) return message
  return {
    ...message,
    thread: {
      cardId: message.cardId,
      messageId: message.id,
      threadId,
      threadType,
      repliesCount: 0,
      lastReply: new Date()
    }
  }
}

function updateThread (
  message: OldMessage,
  threadId: CardID,
  threadType?: CardType,
  repliesCountOp?: 'increment' | 'decrement',
  lastReply?: Date
): OldMessage {
  if (repliesCountOp === undefined && lastReply === undefined) return message
  if (message.thread === undefined) return message
  if (message.thread.threadId !== threadId) return message

  let count = message.thread.repliesCount
  if (repliesCountOp === 'increment') {
    count = count + 1
  }

  if (repliesCountOp === 'decrement') {
    count = Math.max(count - 1, 0)
  }

  return {
    ...message,
    thread: {
      ...message.thread,
      repliesCount: count,
      threadType: threadType ?? message.thread.threadType,
      lastReply: lastReply ?? message.thread.lastReply
    }
  }
}

interface OldMessage {
  id: MessageID
  cardId: CardID
  type: 'message' | 'activity'
  content: Markdown
  extra?: MessageExtra
  creator: SocialID
  created: Date

  removed: boolean
  edited?: Date

  reactions: OldReaction[]
  attachments: Attachment[]
  thread?: OldThread
}

interface OldReaction {
  reaction: string
  creator: SocialID
  created: Date
}

interface OldThread {
  cardId: CardID
  messageId: MessageID
  threadId: CardID
  threadType: CardType
  repliesCount: number
  lastReply: Date
}

type Patch = UpdatePatch | RemovePatch | ReactionPatch | ThreadPatch | AttachmentPatch

enum PatchType {
  update = 'update',
  remove = 'remove',
  reaction = 'reaction',
  attachment = 'attachment',
  thread = 'thread'
}

interface BasePatch {
  messageId: MessageID
  type: PatchType
  creator: SocialID
  created: Date

  data: Record<string, any>
}

interface UpdatePatch extends BasePatch {
  type: PatchType.update
  data: UpdatePatchData
}

interface UpdatePatchData {
  content?: Markdown
  extra?: MessageExtra
}

interface RemovePatch extends BasePatch {
  type: PatchType.remove
  data: RemovePatchData
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RemovePatchData {}

interface ReactionPatch extends BasePatch {
  type: PatchType.reaction
  data: AddReactionPatchData | RemoveReactionPatchData
}

interface AddReactionPatchData {
  operation: 'add'
  reaction: string
}

interface RemoveReactionPatchData {
  operation: 'remove'
  reaction: string
}

interface AttachmentPatch extends BasePatch {
  type: PatchType.attachment
  data: AddAttachmentsPatchData | RemoveAttachmentsPatchData | SetAttachmentsPatchData | UpdateAttachmentsPatchData
}

interface AddAttachmentsPatchData {
  operation: 'add'
  attachments: AttachmentData[]
}

interface RemoveAttachmentsPatchData {
  operation: 'remove'
  ids: AttachmentID[]
}

interface SetAttachmentsPatchData {
  operation: 'set'
  attachments: AttachmentData[]
}

interface UpdateAttachmentsPatchData {
  operation: 'update'
  attachments: AttachmentUpdateData[]
}

interface ThreadPatch extends BasePatch {
  type: PatchType.thread
  data: AttachThreadPatchData | UpdateThreadPatchData
}

interface AttachThreadPatchData {
  operation: 'attach'
  threadId: CardID
  threadType: CardType
}

interface UpdateThreadPatchData {
  operation: 'update'
  threadId: CardID
  threadType?: CardType
  repliesCountOp?: 'increment' | 'decrement'
  lastReply?: Date
}

interface FileMetadata {
  cardId: CardID
  title: string
  fromDate: Date
  toDate: Date
}

interface FileMessage {
  id: MessageID
  type: 'message' | 'activity'
  content: Markdown
  extra?: MessageExtra

  creator: SocialID
  created: Date

  removed: boolean
  edited?: Date

  reactions: OldReaction[]
  attachments: Attachment[]
  thread?: FileThread
}

interface FileThread {
  threadId: CardID
  threadType: CardType
  repliesCount: number
  lastReply: Date
}

interface ParsedFile {
  cardId: CardID
  title: string
  fromDate: Date
  toDate: Date
  messages: OldMessage[]
}
