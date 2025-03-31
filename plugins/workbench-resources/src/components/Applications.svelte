<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher } from 'svelte'
  import core, { getCurrentAccount, type Ref } from '@hcengineering/core'
  import { createNotificationsQuery, createQuery } from '@hcengineering/presentation'
  import { Scroller, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import type { Application } from '@hcengineering/workbench'
  import workbench from '@hcengineering/workbench'
  import inbox, { inboxId } from '@hcengineering/inbox'
  import chat, { chatId } from '@hcengineering/chat'

  import { isAppAllowed } from '../utils'
  import AppItem from './AppItem.svelte'

  export let active: Ref<Application> | undefined
  export let apps: Application[] = []
  export let direction: 'vertical' | 'horizontal' = 'vertical'

  const dispatch = createEventDispatcher()

  let loaded: boolean = false
  let hiddenAppsIds: Array<Ref<Application>> = []
  const hiddenAppsIdsQuery = createQuery()
  hiddenAppsIdsQuery.query(
    workbench.class.HiddenApplication,
    {
      space: core.space.Workspace
    },
    (res) => {
      hiddenAppsIds = res.map((r) => r.attachedTo)
      loaded = true
    }
  )

  let hasNewInboxNotifications = false
  const notificationCountQuery = createNotificationsQuery()

  notificationCountQuery.query({ read: false, limit: 1 }, (res) => {
    hasNewInboxNotifications = res.getResult().length > 0
  })

  const me = getCurrentAccount()

  $: topApps = apps.filter((it) => it.position === 'top')
  $: bottomdApps = apps.filter((it) => !hiddenAppsIds.includes(it._id) && isAppAllowed(it, me) && it.position !== 'top')

  const chatApp = chatId as any as Ref<Application>
  const inboxApp = inboxId as any as Ref<Application>
</script>

<div class="flex-{direction === 'horizontal' ? 'row-center' : 'col-center'} clear-mins apps-{direction} relative">
  {#if loaded}
    <Scroller
      invertScroll
      padding={direction === 'horizontal' ? '.75rem .5rem' : '.5rem .75rem'}
      gap={direction === 'horizontal' ? 'gap-1' : 'gapV-1'}
      horizontal={direction === 'horizontal'}
      contentDirection={direction}
      align={direction === 'horizontal' ? 'center' : 'start'}
      buttons={'union'}
    >
      {#each topApps as app}
        <NavLink app={app.alias} shrink={0} disabled={app._id === active}>
          <AppItem
            selected={app._id === active}
            icon={app.icon}
            label={app.label}
            navigator={app._id === active && $deviceInfo.navigator.visible}
            on:click={() => {
              if (app._id === active) dispatch('toggleNav')
            }}
          />
        </NavLink>
      {/each}
      <div class="divider" />
      {#each bottomdApps as app}
        <NavLink app={app.alias} shrink={0} disabled={app._id === active}>
          <AppItem
            selected={app._id === active}
            icon={app.icon}
            label={app.label}
            navigator={app._id === active && $deviceInfo.navigator.visible}
            on:click={() => {
              if (app._id === active) dispatch('toggleNav')
            }}
          />
        </NavLink>
      {/each}
      <div class="divider" />
      <NavLink
        app={inboxId}
        shrink={0}
        restoreLastLocation
        disabled={!$deviceInfo.navigator.visible && $deviceInfo.navigator.float && active === inboxApp}
      >
        <AppItem
          icon={inbox.icon.Inbox}
          label={inbox.string.Inbox}
          selected={active === inboxApp}
          navigator={active === inboxApp && $deviceInfo.navigator.visible}
          notify={hasNewInboxNotifications}
        />
      </NavLink>
      <NavLink
        app={chatId}
        shrink={0}
        restoreLastLocation
        disabled={!$deviceInfo.navigator.visible && $deviceInfo.navigator.float && active === chatApp}
      >
        <AppItem
          icon={chat.icon.ChatBubble}
          label={chat.string.Chat}
          selected={active === chatApp}
          navigator={active === chatApp && $deviceInfo.navigator.visible}
        />
      </NavLink>
      <div class="apps-space-{direction}" />
    </Scroller>
  {/if}
</div>

<style lang="scss">
  .apps-horizontal {
    justify-content: center;
    margin: 0 0.5rem 0 0.25rem;
    height: var(--app-panel-width);
    min-height: 4rem;

    .divider {
      margin-left: 0.5rem;
      width: 1px;
      height: 2.25rem;
    }
  }
  .apps-vertical {
    margin-bottom: 0.5rem;
    width: var(--app-panel-width);
    min-width: 4rem;

    .divider {
      margin-top: 1rem;
      width: 2.25rem;
      height: 1px;
    }
  }
  .divider {
    flex-shrink: 0;
    background-color: var(--theme-navpanel-icons-divider);
  }
  .apps-space {
    &-vertical {
      min-height: 0.5rem;
      height: 0.5rem;
    }
    &-horizontal {
      min-width: 0.5rem;
      width: 0.5rem;
    }
  }
</style>
