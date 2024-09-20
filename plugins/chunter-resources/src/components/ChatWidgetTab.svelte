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
  import { Action, Menu, ModernTab, showPopup } from '@hcengineering/ui'
  import { Widget } from '@hcengineering/workbench'
  import { getResource } from '@hcengineering/platform'
  import { ChatWidgetTab } from '@hcengineering/chunter'
  import { InboxNotification } from '@hcengineering/notification'
  import {
    getNotificationsCount,
    InboxNotificationsClientImpl,
    isActivityNotification,
    isMentionNotification,
    NotifyMarker
  } from '@hcengineering/notification-resources'
  import chunter from '../plugin'
  import { onDestroy } from 'svelte'
  import { getClient } from '@hcengineering/presentation'

  export let tab: ChatWidgetTab
  export let widget: Widget
  export let selected = false
  export let actions: Action[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = notificationClient.contextByDoc

  $: icon = tab.icon ?? widget.icon

  $: if (tab.iconComponent) {
    void getResource(tab.iconComponent).then((res) => {
      icon = res
    })
  }
  let notifications: InboxNotification[] = []

  let count: number = 0

  $: objectId = tab.data.thread ?? tab.data._id
  $: context = objectId ? $contextByDocStore.get(objectId) : undefined

  const unsubscribe = notificationClient.inboxNotificationsByContext.subscribe((res) => {
    if (context === undefined) {
      count = 0
      return
    }

    notifications = (res.get(context._id) ?? []).filter((n) => {
      if (isActivityNotification(n)) return true

      return isMentionNotification(n) && hierarchy.isDerived(n.mentionedInClass, chunter.class.ChatMessage)
    })
  })

  $: void getNotificationsCount(context, notifications).then((res) => {
    count = res
  })

  onDestroy(() => {
    unsubscribe()
  })

  function handleMenu (event: MouseEvent): void {
    if (actions.length === 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    showPopup(Menu, { actions }, event.target as HTMLElement)
  }
</script>

<ModernTab
  label={tab.name}
  labelIntl={tab.nameIntl ?? widget.label}
  highlighted={selected}
  orientation="vertical"
  kind={tab.isPinned ? 'secondary' : 'primary'}
  {icon}
  iconProps={tab.iconProps}
  canClose={!tab.isPinned}
  maxSize="13.5rem"
  on:close
  on:click
  on:contextmenu={handleMenu}
>
  <svelte:fragment slot="prefix">
    {#if count > 0}
      <NotifyMarker kind="simple" size="xx-small" />
    {/if}
  </svelte:fragment>
</ModernTab>
