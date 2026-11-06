//
// Copyright © 2026 TraceX SAS.
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

import { type PlatformContext } from '@hcengineering/ai-core'
import attachment from '@hcengineering/attachment'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import contact, { getName, type Person, type SocialIdentity } from '@hcengineering/contact'
import {
  SortingOrder,
  type Class,
  type DocumentQuery,
  type FindOptions,
  type Markup,
  type QuerySelector,
  type Ref
} from '@hcengineering/core'
import { jsonToMarkup, markupToJSON, MarkupNodeType, type MarkupNode } from '@hcengineering/text-core'
import { markdownToMarkup, markupToMarkdown } from '@hcengineering/text-markdown'
import { buildClassSummary } from '../shared'
import { ChatToolError, type ResolvedChat, type ResolvedStream } from './chats'
import { withIdBoundary } from './discovery'
import type { ChatMessageOutput } from './schemas'

export interface MessagePageOptions {
  limit?: number
  direction?: 'older' | 'newer'
  cursor?: string
}

interface MessageCursor {
  date: number
  id: string
}

export interface MessagePage {
  messages: ChatMessage[]
  hasMore: boolean
  nextCursor?: string
}

export function messageCursor (message: ChatMessage): string {
  return JSON.stringify({ date: message.createdOn ?? message.modifiedOn, id: message._id })
}

function parseMessageCursor (value: string): MessageCursor {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'date' in parsed &&
      'id' in parsed &&
      typeof parsed.date === 'number' &&
      Number.isFinite(parsed.date) &&
      typeof parsed.id === 'string' &&
      parsed.id.length > 0
    ) {
      return { date: parsed.date, id: parsed.id }
    }
  } catch {
    // Invalid cursors are reported with the same public error below.
  }
  throw new ChatToolError(
    'invalid_cursor',
    'Use the continuation cursor from the preceding page with the same filters.'
  )
}

export function streamMessageQuery (stream: ResolvedStream): DocumentQuery<ChatMessage> {
  return {
    attachedTo: stream.root?._id ?? stream.chat.doc._id,
    attachedToClass: stream.root?._class ?? stream.chat.doc._class,
    space: stream.chat.spaceId
  }
}

/** Read a scoped query; date/id cursors also support merging pages from several streams. */
export async function readMessagePage (
  ctx: PlatformContext,
  stream: ResolvedStream,
  args: MessagePageOptions,
  query: DocumentQuery<ChatMessage> = streamMessageQuery(stream)
): Promise<MessagePage> {
  const messageClass: Ref<Class<ChatMessage>> =
    stream.root === undefined ? chunter.class.ChatMessage : chunter.class.ThreadMessage
  return await readMessageQuery(ctx, messageClass, args, query)
}

export async function readMessageQuery (
  ctx: PlatformContext,
  messageClass: Ref<Class<ChatMessage>>,
  args: MessagePageOptions,
  query: DocumentQuery<ChatMessage>
): Promise<MessagePage> {
  const limit = args.limit ?? 50
  const direction = args.direction ?? 'older'
  const order = direction === 'older' ? SortingOrder.Descending : SortingOrder.Ascending
  const fetchLimit = limit + 1
  const options: FindOptions<ChatMessage> = { limit: fetchLimit, sort: { createdOn: order, _id: order } }
  const cursor = args.cursor !== undefined ? parseMessageCursor(args.cursor) : undefined
  const lowerBound = typeof query.createdOn === 'object' ? query.createdOn.$gt : undefined
  let messages: ChatMessage[]

  if (cursor === undefined || (direction === 'newer' && lowerBound !== undefined && cursor.date <= lowerBound)) {
    messages = await ctx.client.findAll(messageClass, query, options)
  } else if (direction === 'older' && lowerBound !== undefined && cursor.date <= lowerBound) {
    return { messages: [], hasMore: false }
  } else {
    // Finish the cursor timestamp first; DocumentQuery does not support $or.
    const sameTimestampQuery = withIdBoundary<ChatMessage>({ ...query, createdOn: cursor.date }, cursor.id, direction)
    messages = await ctx.client.findAll(messageClass, sameTimestampQuery, options)
    if (messages.length < fetchLimit) {
      const timeRange: QuerySelector<number> =
        direction === 'older'
          ? { $lt: cursor.date, ...(lowerBound !== undefined ? { $gt: lowerBound } : {}) }
          : { $gt: cursor.date }
      const remaining = await ctx.client.findAll(
        messageClass,
        { ...query, createdOn: timeRange },
        { ...options, limit: fetchLimit - messages.length }
      )
      messages.push(...remaining)
    }
  }

  const hasMore = messages.length > limit
  const page = messages.slice(0, limit)
  const nextCursor = hasMore ? messageCursor(page[page.length - 1]) : undefined
  if (direction === 'older') page.reverse()
  return { messages: page, hasMore, nextCursor }
}

export async function summarizeMessages (
  ctx: PlatformContext,
  chat: ResolvedChat,
  messages: ChatMessage[]
): Promise<ChatMessageOutput[]> {
  if (messages.length === 0) return []
  const authorIds = [...new Set(messages.map((message) => message.createdBy ?? message.modifiedBy))]
  const [identities, attachments] = await Promise.all([
    ctx.client.findAll(contact.class.SocialIdentity, { _id: { $in: authorIds as SocialIdentity['_id'][] } }),
    ctx.client.findAll(attachment.class.Attachment, {
      attachedTo: { $in: messages.map((message) => message._id) },
      space: chat.spaceId
    })
  ])
  let people: Person[] = []
  if (identities.length > 0) {
    people = await ctx.client.findAll(contact.class.Person, {
      _id: { $in: identities.map((identity) => identity.attachedTo) }
    })
  }
  const peopleById = new Map(people.map((person) => [person._id, person]))
  const identitiesById = new Map<string, SocialIdentity>(identities.map((identity) => [identity._id, identity]))

  return await Promise.all(
    messages.map(async (message): Promise<ChatMessageOutput> => {
      const authorId = message.createdBy ?? message.modifiedBy
      const identity = identitiesById.get(authorId)
      const person = identity !== undefined ? peopleById.get(identity.attachedTo) : undefined
      const messageAttachments = attachments.filter((file) => file.attachedTo === message._id)
      const attachmentSummaries = await Promise.all(
        messageAttachments.map(async (file) => ({
          id: file._id,
          name: file.name,
          blobId: file.file,
          size: file.size,
          type: file.type,
          url: await attachmentUrl(ctx, file.file)
        }))
      )

      const result: ChatMessageOutput = {
        id: message._id,
        class: await buildClassSummary(ctx.hierarchy, message._class),
        author: {
          id: authorId,
          personId: person?._id,
          name: person !== undefined ? getName(ctx.hierarchy, person) : undefined
        },
        date: message.createdOn ?? message.modifiedOn,
        editedOn: message.editedOn,
        content: markupToMarkdown(markupToJSON(message.message)),
        replies: message.replies ?? 0,
        attachments: attachmentSummaries
      }
      return result
    })
  )
}

async function attachmentUrl (ctx: PlatformContext, blobId: string): Promise<string | undefined> {
  try {
    if (ctx.workspaceIds === undefined) return undefined
    const value = await ctx.storage.getUrl(ctx.ctx, ctx.workspaceIds, blobId)
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? value : undefined
  } catch {
    // Some storage adapters do not provide download URLs. Keep attachment metadata available.
    return undefined
  }
}

export function messageMarkup (content: string): Markup {
  const parsed = markdownToMarkup(content)
  return jsonToMarkup(withoutReferences(parsed))
}

function withoutReferences (node: MarkupNode): MarkupNode {
  if (node.type === MarkupNodeType.reference) {
    const text: MarkupNode = { type: MarkupNodeType.text, text: String(node.attrs?.label ?? '') }
    return text
  }
  const result: MarkupNode = { ...node, content: node.content?.map(withoutReferences) }
  return result
}
