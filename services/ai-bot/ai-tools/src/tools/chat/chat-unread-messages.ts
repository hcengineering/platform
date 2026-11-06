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

import { type PlatformContext, createTool, toolOk } from '@hcengineering/ai-core'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import { type DocumentQuery } from '@hcengineering/core'
import { Type, type Static } from 'typebox'
import { type DiscoveryPage } from './discovery'
import { ChatToolError, requireStream, summarizeStream } from './chats'
import { messageCursor, readMessagePage, readMessageQuery, summarizeMessages } from './messages'
import { getUnreadScope, getUnreadScopes, type UnreadScope } from './unread'
import { ChatTargetSchema, ChatSummarySchema, ChatMessageSchema, ChatLimitSchema, ChatPageProperties } from './schemas'
import { chatUnreadMessagesToolId } from './tool-ids'

export const ChatUnreadMessagesInputSchema = Type.Object(
  {
    target: Type.Optional(ChatTargetSchema),
    limit: ChatLimitSchema,
    cursor: Type.Optional(
      Type.String({ description: 'Continuation with the same target filter. Messages are ordered oldest first.' })
    )
  },
  { additionalProperties: false }
)

export const ChatUnreadMessagesOutputSchema = Type.Object({
  messages: Type.Array(Type.Object({ ...ChatMessageSchema.properties, stream: ChatSummarySchema })),
  ...ChatPageProperties
})

type UnreadMessageOutput = Static<typeof ChatUnreadMessagesOutputSchema>['messages'][number]

interface ScopedMessage {
  message: ChatMessage
  scope: UnreadScope
}

/** Scan a shared chronological query, applying each stream's own reading position. */
async function readGlobalPage (
  ctx: PlatformContext,
  scopes: UnreadScope[],
  limit: number,
  cursor?: string
): Promise<DiscoveryPage<ScopedMessage>> {
  if (scopes.length === 0) return { items: [], hasMore: false, nextCursor: undefined }
  const byParent = new Map(
    scopes.map((scope) => [JSON.stringify([scope.stream.target.class, scope.stream.target.id]), scope])
  )
  const query: DocumentQuery<ChatMessage> = {
    attachedTo: { $in: scopes.map((scope) => scope.stream.target.id as ChatMessage['attachedTo']) },
    createdOn: { $gt: scopes.reduce((date, scope) => Math.min(date, scope.readFrom), Infinity) },
    createdBy: scopes[0].query.createdBy
  }
  const items: ScopedMessage[] = []
  let nextCursor = cursor
  let hasMore = false
  for (let batch = 0; batch < 10; batch++) {
    const page = await readMessageQuery(
      ctx,
      chunter.class.ChatMessage,
      { limit: 100, direction: 'newer', cursor: nextCursor },
      query
    )
    for (const message of page.messages) {
      const scope = byParent.get(JSON.stringify([message.attachedToClass, message.attachedTo]))
      if (scope === undefined || (message.createdOn ?? 0) <= scope.readFrom) continue
      const stream = scope.stream
      if (message.space !== stream.chat.spaceId) continue
      if (message.attachedToClass !== (stream.root?._class ?? stream.chat.doc._class)) continue
      const isReply = ctx.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)
      if (isReply !== (stream.type === 'thread')) continue
      items.push({ message, scope })
    }
    if (items.length > limit) {
      return {
        items: items.slice(0, limit),
        hasMore: true,
        nextCursor: messageCursor(items[limit - 1].message)
      }
    }
    hasMore = page.hasMore
    nextCursor = page.nextCursor
    if (!hasMore) break
  }
  return { items, hasMore, nextCursor }
}

export const chatUnreadMessagesTool = createTool({
  name: chatUnreadMessagesToolId,
  description:
    'Read unread messages oldest first, across all supported streams or within optional target={class,id}. Every message includes its stream target, type, name and parent context so replies can be addressed directly. Uses personal reading boundaries, excludes own social identities, and includes unfollowed thread contexts. Streams with no reading context contribute no messages. Never marks anything read.',
  inputSchema: ChatUnreadMessagesInputSchema,
  outputSchema: ChatUnreadMessagesOutputSchema,
  execute: async (args, ctx: PlatformContext) => {
    const limit = args.limit ?? 50
    let page: DiscoveryPage<ScopedMessage>
    if (args.target !== undefined) {
      const stream = await requireStream(ctx, args.target)
      const scope = await getUnreadScope(ctx, stream)
      if (scope === undefined) return toolOk({ messages: [], hasMore: false })
      const history = await readMessagePage(ctx, stream, { ...args, direction: 'newer' }, scope.query)
      page = {
        items: history.messages.map((message) => ({ message, scope })),
        hasMore: history.hasMore,
        nextCursor: history.nextCursor
      }
    } else {
      page = await readGlobalPage(ctx, await getUnreadScopes(ctx), limit, args.cursor)
    }
    const groups = new Map<string, ScopedMessage[]>()
    for (const item of page.items) {
      const id = JSON.stringify([item.scope.stream.target.class, item.scope.stream.target.id])
      const group = groups.get(id) ?? []
      group.push(item)
      groups.set(id, group)
    }
    const formattedById = new Map<string, UnreadMessageOutput>()
    await Promise.all(
      [...groups.values()].map(async (group) => {
        const stream = group[0].scope.stream
        const [summary, formatted] = await Promise.all([
          summarizeStream(ctx, stream),
          summarizeMessages(
            ctx,
            stream.chat,
            group.map((item) => item.message)
          )
        ])
        for (const message of formatted) {
          const result: UnreadMessageOutput = { ...message, stream: summary }
          formattedById.set(message.id, result)
        }
      })
    )
    const messages = page.items.map(({ message }) => {
      const formatted = formattedById.get(message._id)
      if (formatted === undefined) throw new ChatToolError('message_format_failed', 'Unread message formatting failed.')
      return formatted
    })
    return toolOk({ messages, hasMore: page.hasMore, nextCursor: page.nextCursor })
  }
})
