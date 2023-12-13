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
  import { InboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { ActionContext, getClient } from '@hcengineering/presentation'
  import { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
  import { getLocation, Label, location, navigate, Scroller } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'
  import activity, { ActivityMessage, DisplayActivityMessage, DisplayDocUpdateMessage } from '@hcengineering/activity'
  import { ActivityMessagePresenter } from '@hcengineering/activity-resources'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import Filter from '../Filter.svelte'
  import { getDisplayActivityMessagesByNotifications } from '../../utils'

  export let label: IntlString
  export let _class: Ref<Class<Doc>> | undefined = undefined

  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  let filter: 'all' | 'read' | 'unread' = 'all'

  const notificationsClient = InboxNotificationsClientImpl.getClient()
  const client = getClient()

  let docNotifyContextById: Map<Ref<DocNotifyContext>, DocNotifyContext> = new Map<
  Ref<DocNotifyContext>,
  DocNotifyContext
  >()
  let inboxNotificationByMessage: Map<Ref<ActivityMessage>, InboxNotification> = new Map<
  Ref<ActivityMessage>,
  InboxNotification
  >()
  let inboxNotifications: WithLookup<InboxNotification>[] = []

  notificationsClient.docNotifyContexts.subscribe((res: DocNotifyContext[]) => {
    docNotifyContextById = new Map(res.map((update) => [update._id, update]))
  })

  notificationsClient.inboxNotifications.subscribe((res: InboxNotification[]) => {
    inboxNotifications = res
    inboxNotificationByMessage = new Map(res.map((notification) => [notification.attachedTo, notification]))
  })

  function markNotificationAsViewed (message: DisplayActivityMessage) {
    const combinedIds =
      message._class === activity.class.DocUpdateMessage
        ? (message as DisplayDocUpdateMessage).combinedMessagesIds
        : undefined
    const allMessagesIds = [message._id, ...(combinedIds ?? [])]
    const notifications = allMessagesIds
      .map((id) => inboxNotificationByMessage.get(id))
      .filter((n): n is InboxNotification => !!n)

    notifications.forEach((notification) => {
      client.update(notification, { isViewed: true })
    })
  }

  location.subscribe((loc) => {
    selectedMessageId = loc.path[4] as Ref<ActivityMessage> | undefined
  })

  function openDocActivity (_id: Ref<Doc>) {
    const loc = getLocation()
    loc.path[4] = _id
    navigate(loc)
  }

  function handleMessageClicked (message: DisplayActivityMessage) {
    if (client.getHierarchy().isDerived(message.attachedToClass, activity.class.ActivityMessage)) {
      openDocActivity(message.attachedTo)
      selectedMessageId = message.attachedTo as Ref<ActivityMessage>
    } else {
      openDocActivity(message._id)
      selectedMessageId = message._id
    }
    markNotificationAsViewed(message)
  }

  $: displayMessages = getDisplayActivityMessagesByNotifications(
    inboxNotifications,
    docNotifyContextById,
    filter,
    _class
  )
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
  </div>
  <div class="flex flex-gap-2">
    <Filter bind:filter />
  </div>
</div>

<Scroller>
  <div class="content">
    {#each displayMessages as message}
      <ActivityMessagePresenter
        value={message}
        showNotify={!inboxNotificationByMessage.get(message._id)?.isViewed}
        isSelected={message._id === selectedMessageId}
        onClick={() => {
          handleMessageClicked(message)
        }}
      />
    {/each}
  </div>
</Scroller>

<style lang="scss">
  .content {
    padding: 0 24px;
  }
</style>
