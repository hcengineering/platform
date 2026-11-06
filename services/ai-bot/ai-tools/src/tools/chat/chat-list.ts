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

import { type PlatformContext, createTool, toolFail, toolOk } from '@hcengineering/ai-core'
import chunter from '@hcengineering/chunter'
import { type Class, type Doc, type DocumentQuery, type Ref } from '@hcengineering/core'
import { Type } from 'typebox'
import { DocumentReferenceSchema } from '../shared'
import {
  CHAT_CLASSES,
  chatReferenceForClass,
  findStream,
  getChatClasses,
  requireStream,
  summarizeStream
} from './chats'
import { scanChatSources, type DiscoverySource } from './discovery'
import { ChatLimitSchema, ChatPageProperties, ChatSummarySchema, ChatTypeSchema } from './schemas'
import { chatListToolId } from './tool-ids'

export const ChatListInputSchema = Type.Object(
  {
    type: Type.Optional(ChatTypeSchema),
    parent: Type.Optional(
      Type.With(DocumentReferenceSchema, {
        description:
          'Filter threads by containing chat, or discussions by owner document. Without type, a chat parent selects threads; another document selects discussions.'
      })
    ),
    name: Type.Optional(Type.String({ description: 'Case-insensitive stream name or root-preview substring.' })),
    limit: ChatLimitSchema,
    cursor: Type.Optional(Type.String({ description: 'Continuation with the same filters.' }))
  },
  { additionalProperties: false }
)

export const ChatListOutputSchema = Type.Object({ chats: Type.Array(ChatSummarySchema), ...ChatPageProperties })

export const chatListTool = createTool({
  name: chatListToolId,
  description:
    'Discover streams with target, type, name and optional parent context. Without filters, lists joined channels/directs and accessible discussions. type=thread lists all accessible chat threads with replies, regardless of following; parent optionally selects one chat. For discussions, parent selects the owner document. Document comments are excluded. Never joins or marks anything read.',
  inputSchema: ChatListInputSchema,
  outputSchema: ChatListOutputSchema,
  execute: async (args, ctx: PlatformContext) => {
    let type = args.type
    if (type === undefined && args.parent !== undefined) {
      type =
        chatReferenceForClass(ctx, args.parent.id, args.parent.class as Ref<Class<Doc>>) !== undefined
          ? 'thread'
          : 'discussion'
    }
    if (args.parent !== undefined && type !== 'thread' && type !== 'discussion') {
      return toolFail('parent is only valid for threads and discussions.', 'input_format_error')
    }

    const sources: DiscoverySource[] = []
    if (type === 'thread') {
      const query: DocumentQuery<Doc> = {
        replies: { $gt: 0 },
        attachedToClass: { $in: getChatClasses(ctx) }
      }
      if (args.parent !== undefined) {
        const parent = await requireStream(ctx, args.parent)
        if (parent.root !== undefined) {
          return toolFail('A thread parent must be a chat, not another thread.', 'invalid_parent')
        }
        query.attachedTo = parent.chat.doc._id
        query.attachedToClass = parent.chat.doc._class
        query.space = parent.chat.spaceId
      }
      sources.push({ classId: chunter.class.ChatMessage, query })
    } else {
      for (const [kind, classId] of Object.entries(CHAT_CLASSES)) {
        if (type !== undefined && kind !== type) continue
        if (!ctx.hierarchy.hasClass(classId)) continue
        const query: DocumentQuery<Doc> = {}
        if (kind !== 'discussion') {
          query.members = ctx.token.account
          query.archived = false
        } else if (args.parent !== undefined) {
          query.attachedTo = args.parent.id as Ref<Doc>
          query.attachedToClass = args.parent.class as Ref<Class<Doc>>
        }
        sources.push({ classId, query })
      }
    }

    const nameFilter = args.name?.toLowerCase()
    const { items, ...page } = await scanChatSources(ctx, sources, args.cursor, args.limit ?? 50, async (doc) => {
      const stream = await findStream(ctx, { class: doc._class, id: doc._id })
      if (stream === undefined || stream.chat.archived || !stream.chat.joined) return undefined
      const summary = await summarizeStream(ctx, stream)
      if (nameFilter !== undefined && !summary.name.toLowerCase().includes(nameFilter)) return undefined
      return summary
    })
    return toolOk({ chats: items, ...page })
  }
})
