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
import notification from '@hcengineering/notification'
import { type Doc, type Ref } from '@hcengineering/core'
import { Type } from 'typebox'
import { requireStream } from './chats'
import { ChatTargetSchema } from './schemas'
import { chatMarkReadToolId } from './tool-ids'

export const ChatMarkReadInputSchema = Type.Object(
  {
    target: ChatTargetSchema
  },
  { additionalProperties: false }
)

export const ChatMarkReadOutputSchema = Type.Object({
  target: ChatTargetSchema,
  readAt: Type.Optional(
    Type.Number({
      description: 'Last-viewed timestamp in milliseconds. Omitted when no personal reading context exists.'
    })
  ),
  readCount: Type.Number({ description: 'Number of notifications marked as viewed in the selected context.' })
})

export const chatMarkReadTool = createTool({
  name: chatMarkReadToolId,
  description:
    'Explicitly mark the entire target={class,id} stream as read for the authenticated user. Updates its personal reading timestamp and marks its unviewed notifications as viewed. A chat and each thread are independent. This marks the whole stream, not only a fetched page. Without a personal context, does nothing. Never creates or joins chats or follows threads.',
  inputSchema: ChatMarkReadInputSchema,
  outputSchema: ChatMarkReadOutputSchema,
  execute: async (args, ctx: PlatformContext) => {
    const stream = await requireStream(ctx, args.target)
    const objectId = stream.target.id as Ref<Doc>
    const context = await ctx.client.findOne(notification.class.DocNotifyContext, {
      user: ctx.token.account,
      objectId
    })
    if (context === undefined) {
      return toolOk({ target: stream.target, readCount: 0 })
    }

    const notifications = await ctx.client.findAll(
      notification.class.InboxNotification,
      {
        user: ctx.token.account,
        docNotifyContext: context._id,
        isViewed: false
      },
      { projection: { _id: 1, _class: 1, space: 1 } }
    )

    const readAt = Math.max(context.lastViewedTimestamp ?? 0, Date.now())
    const ops = ctx.client.apply(undefined, 'chat.mark_read', true)
    for (const item of notifications) {
      await ops.updateDoc(item._class, item.space, item._id, { isViewed: true })
    }
    await ops.update(context, { lastViewedTimestamp: readAt })
    const result = await ops.commit()
    if (!result.result) {
      return toolFail('Could not mark the selected chat or thread as read.', 'chat_mark_read_failed')
    }

    return toolOk({ target: stream.target, readAt, readCount: notifications.length })
  }
})
