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
import { Type } from 'typebox'
import { requireStream, summarizeStream } from './chats'
import { readMessagePage, summarizeMessages } from './messages'
import { ChatTargetSchema, ChatSummarySchema, ChatLimitSchema, ChatPageProperties, ChatMessageSchema } from './schemas'
import { chatMessagesToolId } from './tool-ids'

export const ChatMessagesInputSchema = Type.Object(
  {
    target: ChatTargetSchema,
    limit: ChatLimitSchema,
    direction: Type.Optional(
      Type.Enum(['older', 'newer'], {
        description: 'Defaults to older, starting with the latest messages. Pages are chronological.'
      })
    ),
    cursor: Type.Optional(
      Type.String({ description: 'Continuation from the preceding page with the same target and direction.' })
    )
  },
  { additionalProperties: false }
)

export const ChatMessagesOutputSchema = Type.Object({
  stream: ChatSummarySchema,
  root: Type.Optional(ChatMessageSchema),
  messages: Type.Array(ChatMessageSchema),
  ...ChatPageProperties
})

export const chatMessagesTool = createTool({
  name: chatMessagesToolId,
  description:
    'Read history from target={class,id}. A chat target returns its main stream; a root chat message target returns its thread replies and a separate root. Use chat.unread_messages for unread history. Document comments are excluded. Never marks anything read.',
  inputSchema: ChatMessagesInputSchema,
  outputSchema: ChatMessagesOutputSchema,
  execute: async (args, ctx: PlatformContext) => {
    const stream = await requireStream(ctx, args.target)
    const { messages, ...page } = await readMessagePage(ctx, stream, args)
    const toSummarize = stream.root !== undefined ? [stream.root, ...messages] : messages
    const summaries = await summarizeMessages(ctx, stream.chat, toSummarize)
    const root = stream.root !== undefined ? summaries.shift() : undefined
    return toolOk({ stream: await summarizeStream(ctx, stream), root, messages: summaries, ...page })
  }
})
