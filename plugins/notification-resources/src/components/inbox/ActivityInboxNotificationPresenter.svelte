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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'
  import notification, {
    ActivityInboxNotification,
    DisplayActivityInboxNotification,
    InboxNotification
  } from '@hcengineering/notification'
  import { ActivityMessagePresenter, combineActivityMessages } from '@hcengineering/activity-resources'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { getLocation, location, navigate, Action } from '@hcengineering/ui'
  import chunter from '@hcengineering/chunter'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import { getActions } from '@hcengineering/view-resources'
    import { getResource } from '@hcengineering/platform'

  export let value: DisplayActivityInboxNotification

  const client = getClient()
  const messagesQuery = createQuery()
  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const notificationsStore = notificationsClient.inboxNotifications

  let messages: ActivityMessage[] = []
  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  let displayMessage: DisplayActivityMessage | undefined = undefined
  let actions: Action[] = []

  location.subscribe((loc) => {
    selectedMessageId = loc.path[4] as Ref<ActivityMessage> | undefined
  })

  $: combinedNotifications = $notificationsStore.filter(({ _id }) =>
    (value.combinedIds as Ref<InboxNotification>[]).includes(_id)
  ) as ActivityInboxNotification[]

  $: messageIds = combinedNotifications.map(({ attachedTo }) => attachedTo)
  $: messagesQuery.query(
    activity.class.ActivityMessage,
    { _id: { $in: messageIds } },
    (res) => {
      messages = res
    },
    {
      sort: {
        createdBy: SortingOrder.Ascending
      }
    }
  )

  $: displayMessage = messages.length > 1 ? combineActivityMessages(messages)[0] : messages[0]

  function handleMessageClicked (message?: ActivityMessage): void {
    if (message === undefined) {
      return
    }
    if (message._class === chunter.class.ThreadMessage) {
      openDocActivity(message._id, true)
      selectedMessageId = message._id
    } else if (client.getHierarchy().isDerived(message.attachedToClass, activity.class.ActivityMessage)) {
      openDocActivity(message.attachedTo, false)
      selectedMessageId = message.attachedTo as Ref<ActivityMessage>
    } else {
      openDocActivity(message._id, false)
      selectedMessageId = message._id
    }
    markNotificationViewed()
  }

  function handleReply (message?: ActivityMessage): void {
    if (message === undefined) {
      return
    }

    openDocActivity(message._id, true)
    selectedMessageId = message._id
  }

  function markNotificationViewed () {
    combinedNotifications.forEach((notification) => {
      client.update(notification, { isViewed: true })
    })
  }

  function openDocActivity (_id: Ref<Doc>, thread: boolean) {
    const loc = getLocation()
    loc.path[4] = _id
    loc.query = {
      ...loc.query,
      thread: `${thread}`
    }
    navigate(loc)
  }

  async function getAllActions (value: ActivityInboxNotification): Promise<Action[]> {
    const notificationActions = await getActions(client, value, notification.class.InboxNotification)

    const result: Action[] = []

    for (const action of notificationActions) {
      const actionImpl = await getResource(action.action)
      result.push({
        ...action,
        action: (event?: any) => actionImpl(value, event, action.actionProps)
      })
    }

    return result
  }

  $: getAllActions(value).then((res) => {
    actions = res
  })
</script>

{#if displayMessage !== undefined}
  <ActivityMessagePresenter
    value={displayMessage}
    showNotify={!value.isViewed}
    isSelected={displayMessage._id === selectedMessageId}
    showEmbedded
    {actions}
    onReply={() => {
      handleReply(displayMessage)
    }}
    onClick={() => {
      handleMessageClicked(displayMessage)
    }}
  />
{/if}
