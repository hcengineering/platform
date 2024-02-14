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
  import { ActionIcon, Component, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import notification, {
    ActivityNotificationViewlet,
    DisplayInboxNotification,
    DocNotifyContext
  } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { getDocTitle, getDocIdentifier, Menu } from '@hcengineering/view-resources'
  import chunter from '@hcengineering/chunter'
  import { createEventDispatcher } from 'svelte'
  import { WithLookup } from '@hcengineering/core'

  import InboxNotificationPresenter from './inbox/InboxNotificationPresenter.svelte'
  import NotifyContextIcon from './NotifyContextIcon.svelte'
  import NotifyMarker from './NotifyMarker.svelte'

  export let value: DocNotifyContext
  export let notifications: WithLookup<DisplayInboxNotification>[] = []
  export let viewlets: ActivityNotificationViewlet[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let idTitle: string | undefined
  let title: string | undefined

  $: visibleNotification = notifications[0]

  function showMenu (ev: MouseEvent): void {
    showPopup(
      Menu,
      {
        object: value,
        baseMenuClass: notification.class.DocNotifyContext,
        excludedActions: [
          notification.action.PinDocNotifyContext,
          notification.action.UnpinDocNotifyContext,
          chunter.action.OpenChannel
        ]
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }

  $: presenterMixin = hierarchy.classHierarchyMixin(
    value.attachedToClass,
    notification.mixin.NotificationContextPresenter
  )
  $: isCompact = notifications.length === 1

  let isActionMenuOpened = false

  function handleActionMenuOpened (): void {
    isActionMenuOpened = true
  }

  function handleActionMenuClosed (): void {
    isActionMenuOpened = false
  }

  $: getDocIdentifier(client, value.attachedTo, value.attachedToClass).then((res) => {
    idTitle = res
  })

  $: getDocTitle(client, value.attachedTo, value.attachedToClass).then((res) => {
    title = res
  })
</script>

{#if visibleNotification}
  {@const unreadCount = notifications.filter(({ isViewed }) => !isViewed).length}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="card"
    class:compact={isCompact}
    on:click={() => {
      dispatch('click', { context: value, notification: visibleNotification })
    }}
  >
    {#if isCompact}
      <InboxNotificationPresenter value={visibleNotification} {viewlets} showNotify={false} withFlatActions />
      <div class="notifyMarker compact">
        <NotifyMarker count={unreadCount} />
      </div>
    {:else}
      <div class="header">
        <NotifyContextIcon {value} />

        {#if presenterMixin?.labelPresenter}
          <Component is={presenterMixin.labelPresenter} props={{ notification: visibleNotification, context: value }} />
        {:else}
          <div class="labels">
            {#if idTitle}
              {idTitle}
            {:else}
              <Label label={hierarchy.getClass(value.attachedToClass).label} />
            {/if}
            <div class="title overflow-label" {title}>
              {title ?? hierarchy.getClass(value.attachedToClass).label}
            </div>
          </div>
        {/if}
      </div>
      <div class="actions clear-mins flex flex-gap-2 items-center" class:opened={isActionMenuOpened}>
        <ActionIcon icon={IconMoreH} size="small" action={showMenu} />
      </div>
      <div class="notifyMarker">
        <NotifyMarker count={unreadCount} />
      </div>
      <div class="notification">
        <InboxNotificationPresenter value={visibleNotification} {viewlets} embedded skipLabel />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .card {
    display: flex;
    position: relative;
    flex-direction: column;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    padding-right: 0;
    margin: 0.5rem 0;

    &.compact {
      padding: 0;
      margin: 0;
    }

    .header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-left: 0.25rem;
    }

    .title {
      font-weight: 500;
      max-width: 20.5rem;
    }

    .actions {
      position: absolute;
      visibility: hidden;
      top: 0.75rem;
      right: 0.75rem;
      color: var(--theme-halfcontent-color);

      &.opened {
        visibility: visible;
      }
    }

    &:hover > .actions {
      visibility: visible;
    }
  }

  .labels {
    display: flex;
    flex-direction: column;
  }

  .notification {
    margin-top: 0.25rem;
    margin-left: 4rem;
  }

  .notifyMarker {
    position: absolute;
    left: 0.25rem;
    top: 0;

    &.compact {
      left: 0.25rem;
      top: 0.5rem;
    }
  }
</style>
