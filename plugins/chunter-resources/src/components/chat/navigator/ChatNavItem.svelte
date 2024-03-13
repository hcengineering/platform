<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import notification, { DocNotifyContext, InboxNotification } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, IconEdit } from '@hcengineering/ui'
  import { getActions } from '@hcengineering/view-resources'
  import { getNotificationsCount, InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { createEventDispatcher } from 'svelte'

  import NavItem from './NavItem.svelte'
  import { ChatNavItemModel } from '../types'

  export let context: DocNotifyContext
  export let item: ChatNavItemModel
  export let isSelected = false

  const client = getClient()
  const dispatch = createEventDispatcher()
  const notificationClient = InboxNotificationsClientImpl.getClient()

  let notifications: InboxNotification[] = []

  let notificationsCount = 0
  let actions: Action[] = []

  notificationClient.inboxNotificationsByContext.subscribe((res) => {
    notifications = (res.get(context._id) ?? []).filter(
      ({ _class }) => _class === notification.class.ActivityInboxNotification
    )
  })

  $: void getNotificationsCount(context, notifications).then((res) => {
    notificationsCount = res
  })

  $: void getChannelActions(context).then((res) => {
    actions = res
  })

  async function getChannelActions (context: DocNotifyContext): Promise<Action[]> {
    const result = []
    const excludedActions = [
      notification.action.DeleteContextNotifications,
      notification.action.UnReadNotifyContext,
      notification.action.ReadNotifyContext
    ]
    const actions = (await getActions(client, context, notification.class.DocNotifyContext)).filter(
      ({ _id }) => !excludedActions.includes(_id)
    )

    for (const action of actions) {
      const { visibilityTester } = action
      const isVisibleFn = visibilityTester && (await getResource(visibilityTester))
      const isVisible = isVisibleFn ? await isVisibleFn(context) : true

      if (!isVisible) {
        continue
      }

      result.push({
        icon: action.icon ?? IconEdit,
        label: action.label,
        action: async (_: any, evt: Event) => {
          const impl = await getResource(action.action)
          await impl(context, evt, action.actionProps)
        }
      })
    }
    return result
  }
</script>

<NavItem
  id={item.id}
  icon={item.icon}
  withIconBackground={item.withIconBackground}
  isSecondary={item.isSecondary}
  iconSize={item.iconSize}
  {isSelected}
  iconProps={{ value: item.object }}
  {notificationsCount}
  title={item.title}
  description={item.description}
  {actions}
  on:click={() => {
    dispatch('select', { doc: item.object, context })
  }}
/>
