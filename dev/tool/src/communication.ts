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
import { type JsonPatch, type HulylakeWorkspaceClient } from '@hcengineering/hulylake-client'
import type postgres from 'postgres'
import {
  type AccountUuid,
  DOMAIN_SPACE,
  fillDefaults,
  generateId,
  generateUuid,
  type Hierarchy,
  type LowLevelStorage,
  type MarkupBlobRef,
  type MeasureContext,
  type PersonId,
  type PersonUuid,
  type Rank,
  type Ref,
  SortingOrder,
  type WorkspaceUuid,
  systemAccountUuid,
  notEmpty,
  type Class,
  type Markup,
  type WithLookup,
  RateLimiter,
  type Doc
} from '@hcengineering/core'
import {
  type AttachmentDoc,
  type AttachmentID,
  type BlobID,
  type CardID,
  type CardType,
  type Emoji,
  type MessageDoc,
  type MessageID,
  type MessagesDoc,
  type MessagesGroupDoc,
  MessageType,
  type ThreadDoc,
  type CardPeer,
  type Peer
} from '@hcengineering/communication-types'
import { type AccountClient } from '@hcengineering/account-client'
import chunter, {
  type Channel,
  type ChunterSpace,
  type ThreadMessage,
  type DirectMessage
} from '@hcengineering/chunter'
import cardPlugin, { type Card, type CardSpace, DOMAIN_CARD } from '@hcengineering/card'
import { makeRank } from '@hcengineering/rank'
import chat from '@hcengineering/chat'
import { DOMAIN_ACTIVITY } from '@hcengineering/model-activity'
import { DOMAIN_CONTACT } from '@hcengineering/model-contact'
import { markupToMarkdown } from '@hcengineering/text-markdown'
import { markupToJSON, markupToText } from '@hcengineering/text'
import activity, { type ActivityMessage } from '@hcengineering/activity'
import communication, { type Direct } from '@hcengineering/communication'
import { type Employee, formatName, type Person, type PersonSpace } from '@hcengineering/contact'
import { withRetry, DEFAULT_RETRY_OPTIONS } from '@hcengineering/retry'
import attachment from '@hcengineering/attachment'

const MAX_MESSAGES_BATCH = 200
const MAX_MESSAGES_SIZE = 95 * 1024

const COLLABORATOR_TABLE = 'communication.collaborator'
const LABEL_TABLE = 'communication.label'
const PEER_TABLE = 'communication.peer'
const MESSAGE_INDEX_TABLE = 'communication.message_index'
const THREAD_INDEX_TABLE = 'communication.thread_index'

export async function migrateWorkspaceChat (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  hulylake: HulylakeWorkspaceClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>
): Promise<void> {
  await migrateChannels(ctx, ws, db, client, hierarchy, hulylake, accountClient, personUuidBySocialId)
  await migrateDirects(ctx, ws, db, client, hierarchy, hulylake, accountClient, personUuidBySocialId)
}

async function migrateChannels (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  hulylake: HulylakeWorkspaceClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>
): Promise<void> {
  const docs = await client.rawFindAll<Channel>(
    DOMAIN_SPACE,
    { _class: chunter.class.Channel },
    { sort: { createdOn: SortingOrder.Ascending } }
  )
  const limiter = new RateLimiter(5)
  let i = 0

  if (docs == null || docs.length === 0) return

  for (const doc of docs) {
    if ((doc.messages ?? 0) === 0) continue
    i++
    await limiter.add(async () => {
      try {
        ctx.info('migrate channel', { index: i, _id: doc._id })
        await migrateChannel(ctx, ws, db, client, hierarchy, hulylake, accountClient, personUuidBySocialId, doc)
      } catch (e) {
        ctx.error('Failed to migrate channel', { _id: doc._id })
        ctx.error('Error', { error: e })
      }
    })
  }

  await limiter.waitProcessing()
}

async function migrateChannel (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  hulylake: HulylakeWorkspaceClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  doc: Channel
): Promise<void> {
  const migratedToCard = doc.__migratedToCard
  const lastOne = (
    await client.rawFindAll<Card>(DOMAIN_CARD, {}, { sort: { rank: SortingOrder.Descending }, limit: 1 })
  )[0]
  let spaceId: Ref<CardSpace> = cardPlugin.space.Default
  if (doc.private && migratedToCard?.space == null) {
    const space: CardSpace = {
      name: doc.name,
      description: doc.description,
      members: doc.members,
      private: true,
      archived: doc.archived,
      autoJoin: doc.autoJoin,
      owners: doc.owners,
      types: [chat.masterTag.Thread],
      space: cardPlugin.space.Default,
      modifiedBy: doc.modifiedBy,
      modifiedOn: doc.modifiedOn,
      createdOn: doc.createdOn,
      createdBy: doc.createdBy,
      _class: cardPlugin.class.CardSpace,
      _id: generateId<CardSpace>()
    }
    await client.upload(ctx, DOMAIN_SPACE, [
      { ...space, __migratedFromChunter: true, __migratedFromDoc: doc._id } as any
    ])
    spaceId = space._id
  } else {
    spaceId = (migratedToCard?.space ?? cardPlugin.space.Default) as Ref<CardSpace>
  }

  let card: Card | undefined
  if (migratedToCard?.card != null) {
    card = (await client.rawFindAll<Card>(DOMAIN_CARD, { _id: migratedToCard.card as Ref<Card> }, { limit: 1 }))[0]
  }

  if (card == null) {
    const _id = generateId<Card>()
    const data = fillDefaults<Card>(
      hierarchy,
      {
        title: doc.name,
        rank: makeRank(lastOne?.rank, undefined),
        content: '' as MarkupBlobRef,
        blobs: {},
        parentInfo: []
      },
      chat.masterTag.Thread
    )

    card = {
      ...data,
      space: spaceId,
      modifiedBy: doc.modifiedBy,
      modifiedOn: doc.modifiedOn,
      createdOn: doc.createdOn,
      createdBy: doc.createdBy,
      _class: chat.masterTag.Thread,
      _id
    }

    await client.upload(ctx, DOMAIN_CARD, [{ ...card, __migratedFromChunter: true, __migratedFromDoc: doc._id } as any])
    await addCollaboratorsToDb(db, ws.uuid, card._id, card._class, doc.members)
    await client.rawUpdate<Channel>(
      DOMAIN_SPACE,
      { _id: doc._id },
      { __migratedToCard: { card: card._id, space: spaceId } }
    )
    doc.__migratedUntil = undefined
  }

  await migrateMessages(ctx, ws, db, client, hierarchy, hulylake, accountClient, personUuidBySocialId, doc, [card])
}

async function migrateDirects (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  hulylake: HulylakeWorkspaceClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>
): Promise<void> {
  const docs = await client.rawFindAll<DirectMessage>(
    DOMAIN_SPACE,
    { _class: chunter.class.DirectMessage },
    { sort: { createdOn: SortingOrder.Ascending } }
  )
  if (docs == null || docs.length === 0) return
  const limiter = new RateLimiter(5)

  for (const doc of docs) {
    if ((doc.messages ?? 0) === 0) continue

    await limiter.add(async () => {
      try {
        ctx.info('Start migrate direct', { _id: doc._id })
        await migrateDirect(ctx, ws, db, client, hierarchy, hulylake, accountClient, personUuidBySocialId, doc)
      } catch (e) {
        ctx.error('Failed to migrate direct', { _id: doc._id })
        ctx.error('Error', { error: e })
      }
    })
  }

  await limiter.waitProcessing()
}

async function migrateDirect (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  hulylake: HulylakeWorkspaceClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  doc: DirectMessage
): Promise<void> {
  const migratedToCard = doc.__migratedToCard

  const members = doc.members

  const persons = await client.rawFindAll<Person>(DOMAIN_CONTACT, { personUuid: { $in: members } })
  const personSpaces = (
    await client.rawFindAll<PersonSpace>(DOMAIN_SPACE, { person: { $in: persons.map((p) => p._id) } })
  ).sort((a, b) => a._id.localeCompare(b._id))
  if (personSpaces.length === 0) return

  let lastRank = (
    await client.rawFindAll<Card>(DOMAIN_CARD, {}, { sort: { rank: SortingOrder.Descending }, limit: 1 })
  )[0]?.rank
  const peers: PeerInfo[] = []
  const directs: Direct[] = []

  let createdDirect: Direct | undefined

  if (migratedToCard != null) {
    createdDirect = (
      await client.rawFindAll<Direct>(
        DOMAIN_CARD,
        { _class: communication.type.Direct, _id: migratedToCard.card as Ref<Direct> },
        { limit: 1 }
      )
    )[0]
  }

  if (members.length <= 2 && createdDirect == null) {
    const myDirects = await client.rawFindAll<Direct>(DOMAIN_CARD, {
      _class: communication.type.Direct,
      space: personSpaces[0]._id
    })
    createdDirect = myDirects.find((it) => {
      const directMembers = new Set(it.members)
      const createMembers = new Set(persons.map((p) => p._id))
      if (directMembers.size !== createMembers.size) return false
      for (const item of directMembers) {
        if (!createMembers.has(item as Ref<Employee>)) return false
      }
      return true
    })
  }

  if (createdDirect == null) {
    const peerId = generateId()
    doc.__migratedUntil = undefined

    for (const me of members) {
      const person = persons.find((p) => p.personUuid === me)
      if (person == null) continue
      const space = personSpaces.find((p) => p.person === person._id)
      if (space == null) continue

      const _id = generateId<Direct>()
      const data = fillDefaults<Direct>(
        hierarchy,
        {
          title: getDirectName(me, persons),
          rank: makeRank(lastRank, undefined),
          content: '' as MarkupBlobRef,
          blobs: {},
          parentInfo: [],
          members: persons.map((p) => p._id),
          peerId
        },
        communication.type.Direct
      )
      lastRank = data.rank

      const direct: Direct = {
        ...data,
        space: space._id,
        modifiedBy: doc.modifiedBy,
        modifiedOn: doc.modifiedOn,
        createdOn: doc.createdOn,
        createdBy: doc.createdBy,
        _class: communication.type.Direct,
        _id
      }

      directs.push(direct)
      peers.push({ cardId: direct._id, space: direct.space as Ref<PersonSpace> })
      await client.upload(ctx, DOMAIN_CARD, [
        { ...direct, __migratedFromChunter: true, __migratedFromDoc: doc._id } as any
      ])
      await addCollaboratorsToDb(db, ws.uuid, direct._id, direct._class, doc.members)
    }
    if (directs.length > 0) {
      await client.rawUpdate<ChunterSpace>(
        DOMAIN_SPACE,
        { _id: doc._id },
        { __migratedToCard: { card: directs[0]._id, space: directs[0].space } }
      )

      await addPeersToDb(db, ws.uuid, peerId, peers)
    }
  } else {
    const cardPeer = await findPeer(db, ws.uuid, createdDirect._id)
    if (cardPeer != null) {
      for (const m of cardPeer.members) {
        const d = (
          await client.rawFindAll<Direct>(DOMAIN_CARD, { _class: communication.type.Direct, _id: m.cardId })
        )[0]

        if (d != null) {
          directs.push(d)
          peers.push({ cardId: m.cardId, space: m.extra.space as Ref<PersonSpace> })
        }
      }
    }
  }

  await migrateMessages(
    ctx,
    ws,
    db,
    client,
    hierarchy,
    hulylake,
    accountClient,
    personUuidBySocialId,
    doc,
    directs,
    peers
  )
}

async function convertChunterMessage (
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  card: Card,
  message: RawMessage,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  accountClient: AccountClient,
  lastRank?: Rank,
  peers: PeerInfo[] = []
): Promise<ConvertedMessage> {
  const oldAttachments: RawAttachment[] = message.attachments
  const oldReactions: RawReaction[] = message.reactions
  let oldReplies: RawMessage[] = []

  const attachments: Record<AttachmentID, AttachmentDoc> = {}
  const reactions: Record<Emoji, Record<PersonUuid, { count: number, date: string }>> = {}

  let thread: Card | undefined
  const threadMessages: MessageDoc[] = []
  const threadCollaborators: AccountUuid[] = []
  const threads: Record<CardID, ThreadDoc> = {}

  if ((message.replies ?? 0) > 0) {
    oldReplies = (
      await client.rawFindAll<ThreadMessage>(
        DOMAIN_ACTIVITY,
        { _class: chunter.class.ThreadMessage, attachedTo: message._id },
        {
          sort: { createdOn: SortingOrder.Ascending },
          lookup: {
            _id: {
              attachments: attachment.class.Attachment,
              reactions: activity.class.Reaction
            }
          }
        }
      )
    ).map(threadMessageToRawMessage)
  }

  if (oldReplies.length > 0) {
    const firstReply = oldReplies[0]
    const lastReply = oldReplies[oldReplies.length - 1]
    const text = sanitizeTitle(markupToText(message.message).trim().slice(0, 30))
    const data = fillDefaults<Card>(
      hierarchy,
      {
        title: text.length > 0 ? text : `Thread in ${card.title}`,
        rank: makeRank(lastRank, undefined),
        content: '' as MarkupBlobRef,
        blobs: {},
        parentInfo: [
          {
            _id: card._id,
            _class: card._class,
            title: card.title
          }
        ],
        ...(peers.length > 0 ? { conversationId: message._id } : {})
      },
      chat.masterTag.Thread
    )
    thread = {
      ...data,
      space: card.space,
      modifiedBy: lastReply.modifiedBy,
      modifiedOn: lastReply.modifiedOn,
      createdOn: firstReply.createdOn ?? message.createdOn,
      createdBy: firstReply.createdBy ?? message.createdBy,
      _class: chat.masterTag.Thread,
      _id: generateId<Card>()
    }

    const repliedPersons: Record<PersonUuid, number> = {}

    for (const oldReply of oldReplies) {
      const personUuid = await getPersonUuidBySocialId(
        accountClient,
        personUuidBySocialId,
        oldReply.createdBy ?? oldReply.modifiedBy
      )

      if (personUuid != null) {
        if (!threadCollaborators.includes(personUuid as AccountUuid)) {
          threadCollaborators.push(personUuid as AccountUuid)
        }
        const current = repliedPersons[personUuid] ?? 0
        repliedPersons[personUuid] = current + 1
      }

      const converted = await convertChunterMessage(
        client,
        hierarchy,
        thread,
        oldReply,
        personUuidBySocialId,
        accountClient
      )

      threadMessages.push(converted.message)
    }
    const personUuid = await getPersonUuidBySocialId(
      accountClient,
      personUuidBySocialId,
      message.createdBy ?? message.modifiedBy
    )

    if (personUuid != null) {
      threadCollaborators.push(personUuid as AccountUuid)
    }

    threads[thread._id] = {
      threadId: thread._id,
      threadType: thread._class,
      repliesCount: oldReplies.length,
      lastReplyDate: new Date(lastReply.createdOn ?? lastReply.modifiedOn).toISOString(),
      repliedPersons
    }
  }

  for (const oldAttachment of oldAttachments) {
    const id = oldAttachment._id as any as AttachmentID
    if (oldAttachment.type !== 'application/link-preview') {
      attachments[id] = {
        id,
        mimeType: oldAttachment.type,
        params: {
          blobId: oldAttachment.file,
          fileName: oldAttachment.name,
          size: oldAttachment.size,
          metadata: oldAttachment.metadata
        },
        creator: oldAttachment.createdBy,
        created: new Date(oldAttachment.createdOn).toISOString(),
        modified: null
      }
    }
  }

  for (const oldReaction of oldReactions) {
    const emoji = oldReaction.emoji as any as Emoji
    const personsData = reactions[emoji] ?? {}
    const personUuid =
      (await getPersonUuidBySocialId(accountClient, personUuidBySocialId, oldReaction.createdBy)) ?? systemAccountUuid

    personsData[personUuid] = { count: 1, date: new Date(oldReaction.createdOn).toISOString() }
    reactions[emoji] = personsData
  }

  const communicationMessage = {
    id: toMessageID(message._id),
    cardId: card._id,
    created: new Date(message.createdOn ?? message.modifiedOn).toISOString(),
    creator: message.createdBy ?? message.modifiedBy,
    type: MessageType.Text,
    content: markupToMarkdown(markupToJSON(message.message)),
    extra: {},
    language: null,
    modified: message.editedOn != null ? new Date(message.editedOn).toISOString() : null,
    attachments,
    reactions,
    threads
  }

  return { message: communicationMessage, thread, threadMessages, threadCollaborators }
}

function getDirectName (me: AccountUuid, persons: Person[]): string {
  if (persons.length === 1) {
    return persons.map((e) => formatName(e.name)).join(', ')
  } else {
    return persons
      .filter((it) => it.personUuid !== me)
      .map((e) => formatName(e.name))
      .join(', ')
  }
}

async function findPeer (db: postgres.Sql, ws: WorkspaceUuid, cardId: CardID): Promise<CardPeer | undefined> {
  const table = db(PEER_TABLE)

  const result = await db<Peer[]>`
    SELECT p.*,
           COALESCE(members.members, '[]') AS members
    FROM ${table} AS p
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object(
                 'workspace_id', p2.workspace_id,
                 'card_id',      p2.card_id,
                 'extra',        p2.extra
               )
             ) AS members
      FROM ${table} AS p2
      WHERE p2.value = p.value
        AND p2.kind = 'card'
        AND NOT (p2.workspace_id = p.workspace_id AND p2.card_id = p.card_id)
    ) AS members ON true
    WHERE p.workspace_id = ${ws}
      AND p.card_id = ${cardId}
      AND p.kind = 'card'
  `

  return result.map((r) => toPeer(r))[0]
}

async function addPeersToDb (
  db: postgres.Sql,
  ws: WorkspaceUuid,
  conversationId: string,
  peers: PeerInfo[]
): Promise<void> {
  const table = db(PEER_TABLE)
  const date = Date.now()
  const rows = peers.map((it) => ({
    workspace_id: ws,
    card_id: it.cardId,
    kind: 'card',
    value: conversationId,
    extra: { space: it.space },
    created: date
  }))

  await db` INSERT INTO ${table} ${db(rows)} ON CONFLICT DO NOTHING`
}

async function addCollaboratorsToDb (
  db: postgres.Sql,
  ws: WorkspaceUuid,
  cardId: CardID,
  cardType: CardType,
  collaborators: AccountUuid[]
): Promise<void> {
  if (collaborators.length === 0) return
  const cTable = db(COLLABORATOR_TABLE)
  const date = Date.now()
  const cRows = collaborators.map((account) => ({
    workspace_id: ws,
    card_id: cardId,
    card_type: cardType,
    date,
    account
  }))

  await db` INSERT INTO ${cTable} ${db(cRows)} ON CONFLICT (workspace_id, card_id, account) DO NOTHING`
  const lTable = db(LABEL_TABLE)

  const lRows = collaborators.map((account) => ({
    workspace_id: ws,
    card_id: cardId,
    card_type: cardType,
    label_id: 'card:label:Subscribed',
    created: date,
    account
  }))
  await db`INSERT INTO ${lTable} ${db(lRows)} ON CONFLICT DO NOTHING`
}

async function isMessageIndexExists (
  ctx: MeasureContext,
  db: postgres.Sql,
  ws: WorkspaceUuid,
  cardId: CardID,
  messageId: MessageID
): Promise<boolean> {
  const table = db(MESSAGE_INDEX_TABLE)
  try {
    const res = await withRetry(
      async () =>
        await db`SELECT * FROM ${table} WHERE workspace_id = ${ws} AND card_id = ${cardId} AND message_id = ${messageId}`
    )
    return res.length > 0
  } catch (e) {
    ctx.error('Failed to find message index', { error: e, ws, cardId, messageId })
    return false
  }
}

async function getActivityCursor (
  db: postgres.Sql,
  ws: WorkspaceUuid,
  space: Ref<ChunterSpace>,
  _class: Ref<Class<ActivityMessage>>,
  limit = 500,
  gte?: number
): Promise<AsyncIterable<postgres.Row[]>> {
  const activivtyTable = db('public.activity')
  const attachmentsTable = db('public.attachment')
  const reactionsTable = db('public.reaction')

  return db`
    SELECT
      _id,
      "modifiedBy",
      "modifiedOn",
      "createdBy",
      "createdOn",
      "attachedTo",
      COALESCE((data->>'replies')::int, 0) AS replies,
      data->'message' AS message,
      data->'editedOn' AS "editedOn",
      (
        SELECT json_agg(
          json_build_object(
            '_id', att._id,
            'createdBy', att."createdBy",
            'createdOn', att."createdOn",
            'type', att.data->>'type',
            'name', att.data->>'name',
            'size', att.data->>'size',
            'metadata', att.data->>'metadata',
            'file', att.data->'file'
          )
        )
        FROM ${attachmentsTable} AS att
        WHERE att."attachedTo" = activity._id
      ) AS attachments,
      (
        SELECT json_agg(
          json_build_object(
            '_id', r._id,
            'createdBy', r."createdBy",
            'createdOn', r."createdOn",
            'emoji', r.data->'emoji'
          )
        )
        FROM ${reactionsTable} AS r
        WHERE r."attachedTo" = activity._id
      ) AS reactions
    FROM ${activivtyTable} AS activity
    WHERE "workspaceId" = ${ws}::uuid
      AND "_class" = ${_class}::text
      AND "attachedTo" = ${space}::text
      ${gte != null ? db`AND "createdOn" >= ${gte}` : db``}
    ORDER BY "createdOn" ASC;
  `.cursor(limit)
}

async function migrateMessages (
  ctx: MeasureContext,
  ws: Workspace,
  db: postgres.Sql,
  client: LowLevelStorage,
  hierarchy: Hierarchy,
  hulylake: HulylakeWorkspaceClient,
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  doc: ChunterSpace,
  cards: Card[],
  peers: PeerInfo[] = []
): Promise<void> {
  if (cards.length === 0) return

  for (const card of cards) {
    await createGroupsBlob(hulylake, card._id)
  }
  const iterator = await getActivityCursor(db, ws.uuid, doc._id, chunter.class.ChatMessage, 400, doc.__migratedUntil)

  let prev: RawMessage[] = []

  let mi = 0
  let last: RawMessage | undefined
  let allIndex = 0
  for await (const nn of iterator) {
    const next = nn.map(toMessage).filter(notEmpty)
    last = next[next.length - 1] ?? last
    allIndex += next.length
    const messages = [...prev, ...next]
    ctx.info('migrate messages', { all: allIndex, current: next.length, messages: messages.length })
    while (messages.length >= MAX_MESSAGES_BATCH || next.length === 0) {
      if (messages.length === 0) break
      const batch = messages.splice(0, MAX_MESSAGES_BATCH)
      const convertedMessages: MessageDoc[] = []
      for (const card of cards) {
        for (const m of batch) {
          mi++
          if (mi % 100 === 0) console.log('convert messages', mi)

          if (doc.__migratedUntil != null && (m?.createdOn ?? 0) <= doc.__migratedUntil) {
            const isExists = await isMessageIndexExists(ctx, db, ws.uuid, card._id, toMessageID(m._id))
            if (isExists) continue
          }

          const converted = await convertChunterMessage(
            client,
            hierarchy,
            card,
            m,
            personUuidBySocialId,
            accountClient,
            card.rank,
            peers
          )
          if (converted.thread != null && converted.threadMessages.length > 0) {
            await createThread(
              ctx,
              db,
              ws.uuid,
              hulylake,
              client,
              converted.message,
              converted.thread,
              converted.threadMessages,
              converted.threadCollaborators,
              peers,
              doc._id
            )
          }
          convertedMessages.push(converted.message)
        }
        await insertMessages(ctx, db, ws.uuid, hulylake, card, convertedMessages)
      }
    }
    prev = messages
  }

  if (prev.length > 0) {
    const convertedMessages: MessageDoc[] = []
    for (const card of cards) {
      for (const m of prev) {
        mi++
        if (mi % 100 === 0) console.log('convert messages', mi)

        if (doc.__migratedUntil != null && (m?.createdOn ?? 0) <= doc.__migratedUntil) {
          const isExists = await isMessageIndexExists(ctx, db, ws.uuid, card._id, toMessageID(m._id))
          if (isExists) continue
        }

        const converted = await convertChunterMessage(
          client,
          hierarchy,
          card,
          m,
          personUuidBySocialId,
          accountClient,
          card.rank,
          peers
        )
        if (converted.thread != null && converted.threadMessages.length > 0) {
          await createThread(
            ctx,
            db,
            ws.uuid,
            hulylake,
            client,
            converted.message,
            converted.thread,
            converted.threadMessages,
            converted.threadCollaborators,
            peers,
            doc._id
          )
        }
        convertedMessages.push(converted.message)
      }

      await insertMessages(ctx, db, ws.uuid, hulylake, card, convertedMessages)
    }
  }

  if (last != null) {
    await client.rawUpdate<Channel>(DOMAIN_SPACE, { _id: doc._id }, { __migratedUntil: last?.createdOn })
  }
}

async function createThread (
  ctx: MeasureContext,
  db: postgres.Sql,
  ws: WorkspaceUuid,
  hulylake: HulylakeWorkspaceClient,
  client: LowLevelStorage,
  parentMessage: MessageDoc,
  thread: Card,
  messages: MessageDoc[],
  collaborators: AccountUuid[],
  peers: PeerInfo[],
  docId: Ref<Doc>
): Promise<void> {
  try {
    await client.upload(ctx, DOMAIN_CARD, [{ ...thread, __migratedFromChunter: true, __migratedFromDoc: docId } as any])
    await addCollaboratorsToDb(db, ws, thread._id, thread._class, collaborators)
    await createGroupsBlob(hulylake, thread._id)
    const parent = {
      ...parentMessage,
      cardId: thread._id,
      extra: { ...parentMessage.extra, threadRoot: true },
      reactions: {},
      threads: {}
    }
    await insertMessages(ctx, db, ws, hulylake, thread, [parent, ...messages])

    if (peers.length > 0 && thread.peerId != null) {
      await addPeersToDb(db, ws, thread.peerId, [{ cardId: thread._id, space: thread.space as Ref<PersonSpace> }])
    }
  } catch (e) {
    ctx.error('Failed to create thread', { thread, parentMessage })
    console.error(e)
  }
}

async function insertMessageIndex (
  db: postgres.Sql,
  ws: WorkspaceUuid,
  blobId: BlobID,
  messages: MessageDoc[]
): Promise<void> {
  try {
    if (messages.length === 0) return
    const table = db(MESSAGE_INDEX_TABLE)
    const rows = messages.map((it) => ({
      workspace_id: ws,
      card_id: it.cardId,
      created: it.created,
      creator: it.creator,
      message_id: it.id,
      blob_id: blobId
    }))

    await withRetry(async () => await db` INSERT INTO ${table} ${db(rows)} ON CONFLICT DO NOTHING`)
  } catch (e) {
    console.error(e)
  }
}

function sanitizeTitle (value: string): string {
  return value.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}

async function insertThreadIndex (db: postgres.Sql, ws: WorkspaceUuid, messages: MessageDoc[]): Promise<void> {
  const threads = messages.flatMap((it) => Object.values(it.threads).map((t) => [it.id, it.cardId, t] as const))
  if (threads.length === 0) return
  try {
    const table = db(THREAD_INDEX_TABLE)
    const rows = threads.map(([messageId, cardId, it]) => ({
      workspace_id: ws,
      card_id: cardId,
      thread_id: it.threadId,
      thread_type: it.threadType,
      message_id: messageId,
      replies_count: it.repliesCount,
      last_reply: it.lastReplyDate ?? new Date().toISOString()
    }))

    await withRetry(async () => await db` INSERT INTO ${table} ${db(rows)} ON CONFLICT DO NOTHING`)
  } catch (e) {
    console.error(e)
  }
}

async function insertMessages (
  ctx: MeasureContext,
  db: postgres.Sql,
  ws: WorkspaceUuid,
  hulylake: HulylakeWorkspaceClient,
  card: Card,
  messages: MessageDoc[]
): Promise<void> {
  const chunks = chunkMessagesBySize(ctx, messages)

  for (const chunk of chunks) {
    const fromDate = chunk.from
    const toDate = chunk.to
    const blobId = generateUuid() as BlobID
    const newGroupDoc: MessagesGroupDoc = {
      cardId: card._id,
      blobId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      count: chunk.count
    }
    const newMessagesDoc: MessagesDoc = {
      cardId: card._id,
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

    await insertMessageIndex(db, ws, blobId, Object.values(newMessagesDoc.messages))
    await insertThreadIndex(db, ws, Object.values(newMessagesDoc.messages))
    await hulylake.patchJson(`${card._id}/messages/groups`, jsonPatches, undefined, DEFAULT_RETRY_OPTIONS)
    await hulylake.putJson(`${card._id}/messages/${blobId}`, newMessagesDoc, undefined, DEFAULT_RETRY_OPTIONS)
  }
}

function toMessageID (_id: Ref<ActivityMessage>): MessageID {
  if (_id.length <= 22) {
    return _id as any as MessageID
  }
  const buf = Buffer.from(_id, 'hex')
  return buf.toString('base64url') as MessageID
}

async function createGroupsBlob (hulylake: HulylakeWorkspaceClient, cardId: CardID): Promise<void> {
  await hulylake.putJson(`${cardId}/messages/groups`, {}, undefined, DEFAULT_RETRY_OPTIONS)
}

function chunkMessagesBySize (
  ctx: MeasureContext,
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
      ctx.warn('Message size is too big, skipping')
      continue
    }

    if (Object.keys(current.chunk).length === 0) {
      ctx.warn('Message size is too big, skipping')
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
      ctx.warn(`Message ${msg.id} still exceeds limit, skipping`)
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

function sizeOfJson (obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), 'utf8')
}

async function getPersonUuidBySocialId (
  accountClient: AccountClient,
  personUuidBySocialId: Map<PersonId, PersonUuid>,
  socialId: PersonId
): Promise<PersonUuid | undefined> {
  if (personUuidBySocialId.has(socialId)) {
    return personUuidBySocialId.get(socialId)
  }
  try {
    const personUuid = await withRetry(async () => await accountClient.findPersonBySocialId(socialId))
    if (personUuid != null) {
      personUuidBySocialId.set(socialId, personUuid)
    }

    return personUuid
  } catch (e) {
    console.log('Failed to find personUuid', { socialId })
    console.log(e)
  }

  return undefined
}

function toPeer (raw: any): CardPeer {
  return {
    workspaceId: raw.workspace_id,
    cardId: raw.card_id,
    value: raw.value,
    extra: raw.extra,
    created: new Date(raw.created),
    kind: 'card',
    members:
      raw.members?.map((it: any) => ({
        workspaceId: it.workspace_id,
        cardId: it.card_id,
        extra: it.extra ?? {}
      })) ?? []
  }
}

function toMessage (r: any): RawMessage | undefined {
  try {
    return {
      _id: r._id,
      modifiedBy: r.modifiedBy,
      modifiedOn: Number(r.modifiedOn ?? 0),
      createdBy: r.createdBy,
      createdOn: Number(r.createdOn ?? 0),
      replies: Number(r.replies ?? 0),
      editedOn: r.editedOn != null ? Number(r.editedOn) : undefined,
      message: r.message,
      attachments: (r.attachments ?? []).map(toAttachment).filter(notEmpty),
      reactions: (r.reactions ?? []).map(toReaction).filter(notEmpty)
    }
  } catch (e) {
    console.log('Failed to deserialize message', r)
    console.log(e)
    return undefined
  }
}

function toAttachment (a: any): RawAttachment | undefined {
  try {
    return {
      _id: a._id,
      createdBy: a.createdBy,
      createdOn: Number(a.createdOn ?? 0),
      type: a.type,
      name: a.name,
      size: Number(a.size ?? 0),
      metadata: a.metadata ?? {},
      file: a.file
    }
  } catch (e) {
    console.log('Failed to deserialize attachment', a)
    console.log(e)
    return undefined
  }
}

function toReaction (r: any): RawReaction | undefined {
  try {
    return {
      _id: r._id,
      createdBy: r.createdBy,
      createdOn: Number(r.createdOn ?? 0),
      emoji: r.emoji
    }
  } catch (e) {
    console.log('Failed to deserialize reaction', r)
    console.log(e)
  }
}

function threadMessageToRawMessage (r: WithLookup<ThreadMessage>): RawMessage {
  return {
    _id: r._id,
    modifiedBy: r.modifiedBy,
    modifiedOn: Number(r.modifiedOn ?? 0),
    createdBy: r.createdBy ?? r.modifiedBy,
    createdOn: Number(r.createdOn ?? 0),
    replies: 0,
    editedOn: r.editedOn != null ? Number(r.editedOn) : undefined,
    message: r.message,
    attachments: (r.$lookup?.attachments ?? []).map(toAttachment).filter(notEmpty),
    reactions: (r.$lookup?.reactions ?? []).map(toReaction).filter(notEmpty)
  }
}

interface ConvertedMessage {
  message: MessageDoc
  thread?: Card
  threadMessages: MessageDoc[]
  threadCollaborators: AccountUuid[]
}

interface PeerInfo {
  cardId: CardID
  space: Ref<PersonSpace>
}

interface RawAttachment {
  _id: string
  createdBy: PersonId
  createdOn: number
  type: string
  name: string
  size: number
  metadata?: Record<string, any>
  file: string
}

interface RawReaction {
  _id: string
  createdBy: PersonId
  createdOn: number
  emoji: string
}

interface RawMessage {
  _id: Ref<ActivityMessage>
  modifiedBy: PersonId
  modifiedOn: number
  createdBy: PersonId
  createdOn: number
  replies: number
  editedOn?: number
  message: Markup
  attachments: RawAttachment[]
  reactions: RawReaction[]
}
