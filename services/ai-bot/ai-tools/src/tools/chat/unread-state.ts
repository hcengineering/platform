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
import contact from '@hcengineering/contact'
import { SortingOrder, type Doc, type PersonId, type Ref } from '@hcengineering/core'
import notification, {
  type ActivityInboxNotification,
  type DocNotifyContext,
  type MentionInboxNotification
} from '@hcengineering/notification'

/** Use message timestamps for the exclusive unread boundary, including older unviewed notifications. */
export async function getChatReadBoundary (
  ctx: PlatformContext,
  objectId: Ref<Doc>,
  context?: DocNotifyContext
): Promise<number | undefined> {
  const readingContext =
    context ??
    (await ctx.client.findOne(notification.class.DocNotifyContext, {
      user: ctx.token.account,
      objectId
    }))
  if (readingContext === undefined) return undefined

  // An existing context without a last-viewed timestamp has never been read.
  const lastViewed = readingContext.lastViewedTimestamp ?? 0
  if (lastViewed === 0) return 0

  const notifications = await ctx.client.findAll(notification.class.InboxNotification, {
    user: ctx.token.account,
    space: readingContext.space,
    docNotifyContext: readingContext._id,
    isViewed: false,
    _class: { $in: [notification.class.ActivityInboxNotification, notification.class.MentionInboxNotification] }
  })

  const messageIds = notifications.map((item) => {
    if (ctx.hierarchy.isDerived(item._class, notification.class.ActivityInboxNotification)) {
      return (item as ActivityInboxNotification).attachedTo as Ref<ChatMessage>
    }
    return (item as MentionInboxNotification).mentionedIn as Ref<ChatMessage>
  })
  if (messageIds.length === 0) return lastViewed

  const firstUnreadMessage = await ctx.client.findOne(
    chunter.class.ChatMessage,
    { _id: { $in: messageIds }, attachedTo: objectId },
    { sort: { createdOn: SortingOrder.Ascending, _id: SortingOrder.Ascending } }
  )
  if (firstUnreadMessage?.createdOn === undefined) return lastViewed

  // Notifications can be created after their messages. The exclusive boundary must include the message itself.
  return Math.min(lastViewed, firstUnreadMessage.createdOn - 1)
}

export async function ownSocialIds (ctx: PlatformContext): Promise<PersonId[]> {
  const person = await ctx.client.findOne(contact.class.Person, { personUuid: ctx.token.account })
  if (person === undefined) return [ctx.client.user]
  const identities = await ctx.client.findAll(contact.class.SocialIdentity, { attachedTo: person._id })
  return [...new Set([ctx.client.user, ...identities.map((identity) => identity._id)])]
}
