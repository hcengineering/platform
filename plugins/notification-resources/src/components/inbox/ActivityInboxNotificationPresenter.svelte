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
  import { matchQuery, Ref, SortingOrder } from '@hcengineering/core'
  import notification, {
    ActivityInboxNotification,
    ActivityNotificationViewlet,
    DisplayActivityInboxNotification,
    InboxNotification
  } from '@hcengineering/notification'
  import { ActivityMessagePresenter, combineActivityMessages } from '@hcengineering/activity-resources'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { location, Action, getLocation, navigate, Component } from '@hcengineering/ui'
  import { getActions } from '@hcengineering/view-resources'
  import { getResource } from '@hcengineering/platform'
  import chunter from '@hcengineering/chunter'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'

  export let value: DisplayActivityInboxNotification
  export let embedded = false
  export let skipLabel = false
  export let showNotify = true
  export let withActions = true
  export let viewlets: ActivityNotificationViewlet[] = []
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()
  const messagesQuery = createQuery()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notificationsStore = inboxClient.inboxNotifications

  let messages: ActivityMessage[] = []
  let viewlet: ActivityNotificationViewlet | undefined = undefined
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

  $: getAllActions(value).then((res) => {
    actions = res
  })

  $: updateViewlet(viewlets, displayMessage)

  function updateViewlet (viewlets: ActivityNotificationViewlet[], message?: DisplayActivityMessage) {
    if (viewlets.length === 0 || message === undefined) {
      viewlet = undefined
      return
    }

    for (const v of viewlets) {
      const matched = matchQuery([message], v.messageMatch, message._class, client.getHierarchy(), true)
      if (matched.length > 0) {
        viewlet = v
        return
      }
    }

    viewlet = undefined
  }

  function handleReply (message?: DisplayActivityMessage): void {
    if (message === undefined) {
      return
    }
    const loc = getLocation()
    loc.fragment = value.docNotifyContext
    loc.query = { thread: message._id }
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
</script>

{#if displayMessage !== undefined}
  {#if viewlet}
    <Component
      is={viewlet.presenter}
      props={{
        message: displayMessage,
        notification: value,
        embedded,
        withActions,
        showNotify,
        actions,
        excludedActions: [chunter.action.ReplyToThread],
        onClick
      }}
    />
  {:else}
    <ActivityMessagePresenter
      value={displayMessage}
      showNotify={showNotify ? !value.isViewed && !embedded : false}
      isSelected={displayMessage._id === selectedMessageId}
      excludedActions={[chunter.action.ReplyToThread]}
      showEmbedded
      {withActions}
      {embedded}
      {skipLabel}
      {actions}
      withFlatActions={false}
      onReply={() => {
        handleReply(displayMessage)
      }}
      {onClick}
    />
  {/if}
{/if}
