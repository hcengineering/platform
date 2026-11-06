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
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import { type Class, type Doc, type DocumentQuery, type PersonId, type Ref } from '@hcengineering/core'
import notification, { type DocNotifyContext } from '@hcengineering/notification'
import { type ResolvedStream, findStream, getChatClasses, ChatToolError } from './chats'
import { getChatReadBoundary, ownSocialIds } from './unread-state'
import { streamMessageQuery } from './messages'

export interface UnreadScope {
  stream: ResolvedStream
  query: DocumentQuery<ChatMessage>
  readFrom: number
}

export function contextClasses (ctx: PlatformContext): Array<Ref<Class<Doc>>> {
  return [...getChatClasses(ctx), ...ctx.hierarchy.getDescendants(chunter.class.ChatMessage)]
}

export async function getUnreadScope (
  ctx: PlatformContext,
  stream: ResolvedStream,
  context?: DocNotifyContext,
  socialIds?: PersonId[]
): Promise<UnreadScope | undefined> {
  const readFrom = await getChatReadBoundary(ctx, stream.target.id as ChatMessage['_id'], context)
  if (readFrom === undefined) return undefined
  const query: DocumentQuery<ChatMessage> = {
    ...streamMessageQuery(stream),
    createdOn: { $gt: readFrom },
    createdBy: { $nin: socialIds ?? (await ownSocialIds(ctx)) }
  }
  return { stream, query, readFrom }
}

export async function countUnread (ctx: PlatformContext, scope: UnreadScope): Promise<number> {
  const classId = scope.stream.root === undefined ? chunter.class.ChatMessage : chunter.class.ThreadMessage
  const result = await ctx.client.findAll(classId, scope.query, { total: true, limit: 1, projection: { _id: 1 } })
  if (result.total === undefined) {
    throw new ChatToolError('count_unavailable', 'Storage did not return a message count.')
  }
  return result.total
}

/** Personal contexts define candidates; UI markers and follow relationships do not filter them. */
export async function getUnreadScopes (ctx: PlatformContext): Promise<UnreadScope[]> {
  const [contexts, socialIds] = await Promise.all([
    ctx.client.findAll(notification.class.DocNotifyContext, {
      user: ctx.token.account,
      objectClass: { $in: contextClasses(ctx) }
    }),
    ownSocialIds(ctx)
  ])
  const scopes = await Promise.all(
    contexts.map(async (context) => {
      const stream = await findStream(ctx, { class: context.objectClass, id: context.objectId })
      if (stream === undefined || !stream.chat.joined || stream.chat.archived) return undefined
      return await getUnreadScope(ctx, stream, context, socialIds)
    })
  )
  return scopes.filter((scope): scope is UnreadScope => scope !== undefined)
}
