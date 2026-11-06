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
import chunter, { type ChatMessage, type ThreadMessage } from '@hcengineering/chunter'
import { generateId, type AttachedData, type Doc } from '@hcengineering/core'
import { isEmptyMarkup } from '@hcengineering/text-core'
import { Type } from 'typebox'
import { requireStream, summarizeStream } from './chats'
import { messageMarkup } from './messages'
import { ChatTargetSchema, ChatSummarySchema } from './schemas'
import { chatSendToolId } from './tool-ids'

export const ChatSendInputSchema = Type.Object(
  {
    target: ChatTargetSchema,
    content: Type.String({
      minLength: 1,
      description: 'Message as Markdown.'
    })
  },
  { additionalProperties: false }
)

export const ChatSendOutputSchema = Type.Object({ id: Type.String(), stream: ChatSummarySchema })

export const chatSendTool = createTool({
  name: chatSendToolId,
  description:
    'Send Markdown as the authenticated user to target={class,id}. Use a chat document for a main-stream message, or a root chat message for a thread reply, including its first reply. Never creates or joins chats. Do not blindly retry an uncertain send.',
  inputSchema: ChatSendInputSchema,
  outputSchema: ChatSendOutputSchema,
  execute: async (args, ctx: PlatformContext) => {
    const stream = await requireStream(ctx, args.target)
    const chat = stream.chat
    if (chat.archived) {
      return toolFail('Cannot send to an archived chat.', 'chat_archived')
    }
    const message = messageMarkup(args.content)
    if (isEmptyMarkup(message)) {
      return toolFail('Message content must not be empty.', 'empty_message')
    }
    const threadRoot = stream.root

    // Resolve response metadata before writing so a lookup failure cannot mask a successful send.
    const summary = await summarizeStream(ctx, stream)
    if (threadRoot !== undefined) {
      const id = generateId<ThreadMessage>()
      const data: AttachedData<ThreadMessage> = {
        message,
        attachments: 0,
        objectId: chat.doc._id,
        objectClass: chat.doc._class
      }
      await ctx.client.addCollection<ChatMessage, ThreadMessage>(
        chunter.class.ThreadMessage,
        chat.spaceId,
        threadRoot._id,
        threadRoot._class,
        'replies',
        data,
        id
      )
      return toolOk({ id, stream: summary })
    }

    const collection = chat.ref.kind === 'discussion' ? 'comments' : 'messages'
    const id = generateId<ChatMessage>()
    const data: AttachedData<ChatMessage> = { message, attachments: 0 }
    await ctx.client.addCollection<Doc, ChatMessage>(
      chunter.class.ChatMessage,
      chat.spaceId,
      chat.doc._id,
      chat.doc._class,
      collection,
      data,
      id
    )
    return toolOk({ id, stream: summary })
  }
})
