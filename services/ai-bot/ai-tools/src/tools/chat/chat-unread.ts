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
import notification from '@hcengineering/notification'
import { Type } from 'typebox'
import { findStream, summarizeStream } from './chats'
import { scanChatPage } from './discovery'
import { ChatLimitSchema, ChatPageProperties, ChatSummarySchema, ChatTypeSchema } from './schemas'
import { chatUnreadToolId } from './tool-ids'
import { ownSocialIds } from './unread-state'
import { contextClasses, countUnread, getUnreadScope } from './unread'

export const ChatUnreadInputSchema = Type.Object(
  {
    type: Type.Optional(ChatTypeSchema),
    limit: ChatLimitSchema,
    cursor: Type.Optional(Type.String({ description: 'Continuation with the same filters.' }))
  },
  { additionalProperties: false }
)

export const ChatUnreadOutputSchema = Type.Object({
  chats: Type.Array(
    Type.Object({
      ...ChatSummarySchema.properties,
      unreadCount: Type.Number({
        description: 'Database count of messages matching unread_messages in this stream; excludes own identities.'
      }),
      readFrom: Type.Number({ description: 'Exclusive unread-history boundary in milliseconds.' })
    })
  ),
  ...ChatPageProperties
})

export const chatUnreadTool = createTool({
  name: chatUnreadToolId,
  description:
    'List streams with unread messages: channels, directs, discussions and threads, each with target, type, name, parent context and unreadCount. Threads are separate rows, including unfollowed threads with personal reading contexts. Counts use the same message range as chat.unread_messages, not UI notification badges. Never marks anything read.',
  inputSchema: ChatUnreadInputSchema,
  outputSchema: ChatUnreadOutputSchema,
  execute: async (args, ctx: PlatformContext) => {
    const socialIds = await ownSocialIds(ctx)
    const { items, ...page } = await scanChatPage(
      ctx,
      notification.class.DocNotifyContext,
      { user: ctx.token.account, objectClass: { $in: contextClasses(ctx) } },
      args.cursor,
      args.limit ?? 50,
      async (context) => {
        const stream = await findStream(ctx, { class: context.objectClass, id: context.objectId })
        if (stream === undefined || !stream.chat.joined || stream.chat.archived) return undefined
        if (args.type !== undefined && stream.type !== args.type) return undefined
        const scope = await getUnreadScope(ctx, stream, context, socialIds)
        if (scope === undefined) return undefined
        const unreadCount = await countUnread(ctx, scope)
        if (unreadCount === 0) return undefined
        return { ...(await summarizeStream(ctx, stream)), unreadCount, readFrom: scope.readFrom }
      }
    )
    return toolOk({ chats: items, ...page })
  }
})
