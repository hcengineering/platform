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
  import { ActionIcon, Component, IconMoreV, Label, showPopup } from '@hcengineering/ui'
  import notification, {
    ActivityNotificationViewlet,
    DisplayInboxNotification,
    DocNotifyContext
  } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { getDocTitle, getDocIdentifier, Menu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { WithLookup } from '@hcengineering/core'

  import InboxNotificationPresenter from './inbox/InboxNotificationPresenter.svelte'
  import NotifyContextIcon from './NotifyContextIcon.svelte'
  import NotifyMarker from './NotifyMarker.svelte'

  export let value: DocNotifyContext
  export let notifications: WithLookup<DisplayInboxNotification>[]
  export let viewlets: ActivityNotificationViewlet[] = []

  const maxNotifications = 3

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let isActionMenuOpened = false
  let unreadCount = 0

  $: unreadCount = notifications.filter(({ isViewed }) => !isViewed).length

  let idTitle: string | undefined
  let title: string | undefined

  $: void getDocIdentifier(client, value.attachedTo, value.attachedToClass).then((res) => {
    idTitle = res
  })

  $: void getDocTitle(client, value.attachedTo, value.attachedToClass).then((res) => {
    title = res
  })

  $: presenterMixin = hierarchy.classHierarchyMixin(
    value.attachedToClass,
    notification.mixin.NotificationContextPresenter
  )

  function showMenu (ev: MouseEvent): void {
    showPopup(
      Menu,
      {
        object: value,
        baseMenuClass: notification.class.DocNotifyContext,
        mode: 'panel'
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }

  function handleActionMenuOpened (): void {
    isActionMenuOpened = true
  }

  function handleActionMenuClosed (): void {
    isActionMenuOpened = false
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="card"
  on:click={() => {
    dispatch('click', { context: value })
  }}
>
  <div class="header">
    <NotifyContextIcon {value} />

    {#if presenterMixin?.labelPresenter}
      <Component is={presenterMixin.labelPresenter} props={{ context: value }} />
    {:else}
      <div class="labels">
        {#if idTitle}
          {idTitle}
        {:else}
          <Label label={hierarchy.getClass(value.attachedToClass).label} />
        {/if}
        <span class="title overflow-label clear-mins" {title}>
          {title ?? hierarchy.getClass(value.attachedToClass).label}
        </span>
      </div>
    {/if}
  </div>

  <div class="notifyMarker">
    <NotifyMarker count={unreadCount} />
  </div>

  <div class="actions clear-mins flex flex-gap-2 items-center" class:opened={isActionMenuOpened}>
    <ActionIcon icon={IconMoreV} size="small" action={showMenu} />
  </div>

  <div class="content">
    <div class="embeddedMarker" />
    <div class="notifications">
      {#each notifications.slice(0, maxNotifications) as notification}
        <div class="notification">
          <InboxNotificationPresenter
            value={notification}
            {viewlets}
            on:click={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dispatch('click', { context: value, notification })
            }}
          />
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    display: flex;
    position: relative;
    flex-direction: column;
    cursor: pointer;
    border-radius: var(--medium-BorderRadius);
    padding: var(--spacing-1) var(--spacing-0_5);

    .header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: var(--spacing-0_5);
      overflow: hidden;
    }

    .title {
      font-weight: 500;
      max-width: 20.5rem;
      color: var(--global-primary-TextColor);
      font-size: 1rem;
      min-width: 0;
    }

    .actions {
      position: absolute;
      visibility: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--extra-small-BorderRadius);
      top: 0.75rem;
      right: 0.75rem;
      width: 1.5rem;
      height: 1.5rem;
      color: var(--global-secondary-TextColor);

      &.opened {
        visibility: visible;
        color: var(--accent-color);
        background: var(--global-ui-hover-BackgroundColor);
      }

      &:hover {
        visibility: visible;
        color: var(--accent-color);
        background: var(--global-ui-hover-BackgroundColor);
      }
    }

    &:hover > .actions {
      visibility: visible;
    }
  }

  .labels {
    display: flex;
    flex-direction: column;
    color: var(--global-secondary-TextColor);
    font-weight: 500;
    font-size: 0.875rem;
    min-width: 0;
  }

  .notification {
    margin-top: var(--spacing-0_5);
  }

  .notifications {
    display: flex;
    width: calc(100% - var(--spacing-4));
    flex-direction: column;
    gap: var(--spacing-0_5);
    margin-top: var(--spacing-0_5);
    margin-left: var(--spacing-0_5);
  }

  .content {
    display: flex;
    width: 100%;
  }

  .notifyMarker {
    position: absolute;
    right: 0;
    top: -0.375rem;
  }

  .embeddedMarker {
    min-width: 0.25rem;
    border-radius: 0.5rem;
    background: var(--global-ui-highlight-BackgroundColor);
    margin-top: var(--spacing-1);
    margin-left: var(--spacing-2_5);
  }
</style>
