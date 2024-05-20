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
  import { ButtonIcon, CheckBox, Component, IconMoreV, Label, showPopup, Spinner, tooltip } from '@hcengineering/ui'
  import notification, {
    ActivityNotificationViewlet,
    DisplayInboxNotification,
    DocNotifyContext,
    InboxNotification
  } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { getDocTitle, getDocIdentifier, Menu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { Class, Doc, IdMap, Ref, WithLookup } from '@hcengineering/core'
  import chunter from '@hcengineering/chunter'
  import { personAccountByIdStore } from '@hcengineering/contact-resources'
  import { Person, PersonAccount } from '@hcengineering/contact'

  import MessagesPopup from './MessagePopup.svelte'
  import InboxNotificationPresenter from './inbox/InboxNotificationPresenter.svelte'
  import NotifyContextIcon from './NotifyContextIcon.svelte'
  import {
    archiveContextNotifications,
    isActivityNotification,
    isMentionNotification,
    unarchiveContextNotifications
  } from '../utils'

  export let value: DocNotifyContext
  export let notifications: WithLookup<DisplayInboxNotification>[]
  export let viewlets: ActivityNotificationViewlet[] = []
  export let archived = false

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

  let groupedNotifications: Array<InboxNotification[]> = []

  $: groupedNotifications = groupNotificationsByUser(notifications, $personAccountByIdStore)

  function isTextMessage (_class: Ref<Class<Doc>>): boolean {
    return hierarchy.isDerived(_class, chunter.class.ChatMessage)
  }

  const canGroup = (it: InboxNotification): boolean => {
    if (isActivityNotification(it) && isTextMessage(it.attachedToClass)) {
      return true
    }

    return isMentionNotification(it) && isTextMessage(it.mentionedInClass)
  }

  function groupNotificationsByUser (
    notifications: WithLookup<InboxNotification>[],
    personAccountById: IdMap<PersonAccount>
  ): Array<InboxNotification[]> {
    const result: Array<InboxNotification[]> = []
    let group: InboxNotification[] = []
    let person: Ref<Person> | undefined = undefined

    for (const it of notifications) {
      const account = it.createdBy ?? it.modifiedBy
      const curPerson = personAccountById.get(account as Ref<PersonAccount>)?.person
      const allowGroup = canGroup(it)

      if (!allowGroup || curPerson === undefined) {
        if (group.length > 0) {
          result.push(group)
          group = []
          person = undefined
        }
        result.push([it])
        continue
      }

      if (curPerson === person || person === undefined) {
        group.push(it)
      } else {
        result.push(group)
        group = [it]
      }

      person = curPerson
    }

    if (group.length > 0) {
      result.push(group)
    }

    return result
  }

  function showMenu (ev: MouseEvent): void {
    ev.stopPropagation()
    ev.preventDefault()
    showPopup(
      Menu,
      {
        object: value,
        baseMenuClass: notification.class.DocNotifyContext,
        excludedActions: archived
          ? [
              notification.action.ArchiveContextNotifications,
              notification.action.ReadNotifyContext,
              notification.action.UnReadNotifyContext
            ]
          : [notification.action.UnarchiveContextNotifications],
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

  let archivingPromise: Promise<any> | undefined = undefined

  async function checkContext (): Promise<void> {
    await archivingPromise
    archivingPromise = archived ? unarchiveContextNotifications(value) : archiveContextNotifications(value)
    await archivingPromise
    archivingPromise = undefined
  }

  function canShowTooltip (group: InboxNotification[]): boolean {
    const first = group[0]

    return canGroup(first)
  }

  function getKey (group: InboxNotification[]): string {
    return group.map((it) => it._id).join('-')
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
    <NotifyContextIcon {value} notifyCount={unreadCount} />

    <div class="labels">
      {#if presenterMixin?.labelPresenter}
        <Component is={presenterMixin.labelPresenter} props={{ context: value }} />
      {:else}
        {#if idTitle}
          {idTitle}
        {:else}
          <Label label={hierarchy.getClass(value.attachedToClass).label} />
        {/if}
        <span class="title overflow-label clear-mins" {title}>
          {#if title}
            {title}
          {:else}
            <Label label={hierarchy.getClass(value.attachedToClass).label} />
          {/if}
        </span>
      {/if}
    </div>

    <div class="actions clear-mins">
      <div class="flex-center">
        {#if archivingPromise !== undefined}
          <Spinner size="small" />
        {:else}
          <CheckBox checked={archived} kind="todo" size="medium" on:value={checkContext} />
        {/if}
      </div>
      <ButtonIcon
        icon={IconMoreV}
        size="small"
        kind="tertiary"
        inheritColor
        pressed={isActionMenuOpened}
        on:click={showMenu}
      />
    </div>
  </div>

  <div class="content">
    <div class="notifications">
      {#each groupedNotifications.slice(0, maxNotifications) as group (getKey(group))}
        <div
          class="notification"
          use:tooltip={canShowTooltip(group)
            ? {
                component: MessagesPopup,
                props: { context: value, notifications: group }
              }
            : undefined}
        >
          <div class="embeddedMarker" />
          <InboxNotificationPresenter
            value={group[0]}
            {viewlets}
            on:click={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dispatch('click', { context: value, notification: group[0] })
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
    padding: var(--spacing-1_5) var(--spacing-1);
    border-bottom: 1px solid var(--global-ui-BorderColor);

    .header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: var(--spacing-0_5);

      .actions {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        top: -0.5rem;
        right: 0.25rem;
        gap: 0.25rem;
        color: var(--global-secondary-TextColor);
      }
    }

    .title {
      font-weight: 400;
      color: var(--global-primary-TextColor);
      min-width: 0;
      margin-right: 1rem;
    }
  }

  .notifications {
    display: flex;
    width: 100%;
    min-width: 0;
    flex-direction: column;
    margin-top: var(--spacing-1);
    margin-left: var(--spacing-2_5);
  }

  .notification {
    position: relative;

    .embeddedMarker {
      position: absolute;
      min-width: 0.25rem;
      border-radius: 0;
      height: 100%;
      background: var(--global-ui-highlight-BackgroundColor);
    }

    &:first-child {
      .embeddedMarker {
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
      }
    }

    &:hover {
      .embeddedMarker {
        border-radius: 0.5rem;
        background: var(--global-primary-LinkColor);
      }
    }

    &:last-child {
      .embeddedMarker {
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
      }
    }
  }

  .labels {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--global-primary-TextColor);
    font-weight: 600;
    font-size: 0.875rem;
    gap: 0.25rem;
    min-width: 0;
    overflow: hidden;
    margin-right: 4rem;
  }

  .content {
    display: flex;
    width: 100%;
  }
</style>
