<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import type { Doc, Ref } from '@hcengineering/core'
  import notification, { ActivityInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, IconEdit } from '@hcengineering/ui'
  import {
    getActions as getContributedActions,
    getDocLinkTitle,
    getDocTitle,
    NavLink,
    TreeItem
  } from '@hcengineering/view-resources'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { ActivityMessage } from '@hcengineering/activity'
  import { ThreadMessage } from '@hcengineering/chunter'

  import chunter from '../../../plugin'
  import { getChannelIcon } from '../../../utils'

  export let doc: Doc
  export let notifyContext: DocNotifyContext
  export let selectedContextId: Ref<DocNotifyContext> | undefined = undefined

  const client = getClient()
  const notificationClient = InboxNotificationsClientImpl.getClient()

  const threadMessagesQuery = createQuery()

  let threadMessages: ThreadMessage[] = []

  $: inboxNotificationsStore = notificationClient.activityInboxNotifications

  $: threadMessagesQuery.query(
    chunter.class.ThreadMessage,
    {
      objectId: doc._id
    },
    (res) => {
      threadMessages = res
    }
  )

  function hasNewMessages (
    context: DocNotifyContext,
    notifications: ActivityInboxNotification[],
    threadMessages: ThreadMessage[]
  ) {
    const { lastViewedTimestamp = 0, lastUpdateTimestamp = 0 } = context

    if (lastViewedTimestamp < lastUpdateTimestamp) {
      return true
    }

    const threadMessagesIds = threadMessages.map(({ _id }) => _id) as Ref<ActivityMessage>[]

    return notifications.some(({ attachedTo, isViewed }) => threadMessagesIds.includes(attachedTo) && !isViewed)
  }

  async function getItemActions (docNotifyContext: DocNotifyContext): Promise<Action[]> {
    const result = []

    const actions = await getContributedActions(client, docNotifyContext, notification.class.DocNotifyContext)

    for (const action of actions) {
      const { visibilityTester } = action
      const getIsVisible = visibilityTester && (await getResource(visibilityTester))
      const isVisible = getIsVisible ? await getIsVisible(docNotifyContext) : true

      if (!isVisible) {
        continue
      }

      result.push({
        icon: action.icon ?? IconEdit,
        label: action.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(action.action)
          await impl(docNotifyContext, evt, action.actionProps)
        }
      })
    }
    return result
  }

  async function getChannelName (doc: Doc): Promise<string | undefined> {
    if (doc._class === chunter.class.DirectMessage) {
      return await getDocTitle(client, doc._id, doc._class, doc)
    }
    return await getDocLinkTitle(client, doc._id, doc._class, doc)
  }
</script>

<NavLink space={notifyContext._id}>
  {#await getChannelName(doc) then name}
    <TreeItem
      _id={notifyContext._id}
      title={name ?? chunter.string.Channel}
      selected={selectedContextId === notifyContext._id}
      icon={getChannelIcon(doc)}
      iconProps={{ value: doc }}
      iconSize="x-small"
      showNotify={hasNewMessages(notifyContext, $inboxNotificationsStore, threadMessages)}
      actions={async () => await getItemActions(notifyContext)}
      indent
    />
  {/await}
</NavLink>
