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
  import { getActions, getObjectLinkId } from '@hcengineering/view-resources'
  import {
    getNotificationsCount,
    InboxNotificationsClientImpl,
    isActivityNotification,
    isMentionNotification
  } from '@hcengineering/notification-resources'
  import { createEventDispatcher } from 'svelte'
  import view from '@hcengineering/view'
  import { Doc } from '@hcengineering/core'

  import NavItem from './NavItem.svelte'
  import { ChatNavItemModel } from '../types'
  import { openChannel } from '../../../navigation'
  import chunter from '../../../plugin'

  export let context: DocNotifyContext | undefined
  export let item: ChatNavItemModel
  export let isSelected = false
  export let type: 'type-link' | 'type-tag' | 'type-anchor-link' | 'type-object' = 'type-link'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  const notificationClient = InboxNotificationsClientImpl.getClient()

  let notifications: InboxNotification[] = []

  let count: number | null = null
  let actions: Action[] = []

  notificationClient.inboxNotificationsByContext.subscribe((res) => {
    if (context === undefined) {
      return
    }

    notifications = (res.get(context._id) ?? []).filter((n) => {
      if (isActivityNotification(n)) return true

      return isMentionNotification(n) && hierarchy.isDerived(n.mentionedInClass, chunter.class.ChatMessage)
    })
  })

  $: void getNotificationsCount(context, notifications).then((res) => {
    count = res === 0 ? null : res
  })

  $: void getChannelActions(context, item.object).then((res) => {
    actions = res
  })

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  async function getChannelActions (context: DocNotifyContext | undefined, object: Doc): Promise<Action[]> {
    const result: Action[] = []

    if (context === undefined) {
      return []
    }

    result.push({
      icon: view.icon.Open,
      label: view.string.Open,
      group: 'edit',
      action: async () => {
        const id = await getObjectLinkId(linkProviders, object._id, object._class, object)
        openChannel(id, object._class, undefined, true)
      }
    })

    const excludedActions = [
      notification.action.ArchiveContextNotifications,
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
        group: action.context.group,
        action: async (_: any, evt: Event) => {
          const impl = await getResource(action.action)
          await impl(context, evt, { ...action.actionProps, object })
        }
      })
    }
    return result
  }
</script>

<NavItem
  _id={item.id}
  icon={item.icon}
  withIconBackground={item.withIconBackground}
  iconSize={item.iconSize}
  {isSelected}
  iconProps={{ ...item.iconProps, value: item.object }}
  {count}
  title={item.title}
  description={item.description}
  secondaryNotifyMarker={context === undefined
    ? false
    : (context?.lastViewedTimestamp ?? 0) < (context?.lastUpdateTimestamp ?? 0)}
  {actions}
  {type}
  on:click={() => {
    dispatch('select', { object: item.object })
  }}
/>
