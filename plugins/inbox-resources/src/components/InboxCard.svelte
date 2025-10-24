<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { createNotificationsQuery, createQuery } from '@hcengineering/presentation'
  import { CheckBox, Loading, Spinner } from '@hcengineering/ui'
  import { AccountRole, Doc, getCurrentAccount } from '@hcengineering/core'
  import notification, { ActivityNotificationViewlet, InboxNotification } from '@hcengineering/notification'
  import { Card } from '@hcengineering/card'
  import { Notification, NotificationType } from '@hcengineering/communication-types'

  import InboxCardIcon from './InboxCardIcon.svelte'
  import InboxCardTitle from './InboxCardTitle.svelte'
  import ModernNotifications from './ModernNotifications.svelte'
  import LegacyNotifications from './legacy/LegacyNotifications.svelte'
  import { NavigationItem } from '../type'
  import { NavigationClient } from '../client'
  import { isReactionNotification } from '@hcengineering/notification-resources'

  export let navClient: NavigationClient
  export let navItem: NavigationItem
  export let selected: boolean = false
  export let viewlets: ActivityNotificationViewlet[] = []

  const account = getCurrentAccount()
  const dispatch = createEventDispatcher()

  let total = 0

  const modernNotificationsQuery = createNotificationsQuery()
  const legacyNotificationsQuery = createQuery()
  const query = createQuery()

  let doc: Doc | undefined = undefined
  let isLoading = true

  query.query(
    navItem._class,
    { _id: navItem._id },
    (res) => {
      doc = res[0]
      dispatch('doc', doc)
      isLoading = false
    },
    { limit: 1 }
  )

  $: if (doc !== undefined && doc?._id !== navItem._id) {
    doc = undefined
    isLoading = true
  }

  $: if (navItem.type === 'modern') {
    legacyNotificationsQuery.unsubscribe()
    modernNotificationsQuery.query(
      { limit: 1, total: true, read: false, strict: true, contextId: navItem.context.id },
      (res) => {
        total = res.getTotal()
      }
    )
  } else {
    modernNotificationsQuery.unsubscribe()
    legacyNotificationsQuery.query(
      notification.class.InboxNotification,
      { isViewed: false, docNotifyContext: navItem.context._id },
      (res) => {
        total = res.total
      },
      {
        total: true,
        limit: 1
      }
    )
  }

  let isRemoving = false
  async function handleToggle (): Promise<void> {
    isRemoving = true
    try {
      await navClient.remove(navItem)
    } finally {
      isRemoving = false
    }
  }

  function asCard (doc: Doc): Card {
    return doc as Card
  }

  function onNotification (event: CustomEvent<InboxNotification | Notification>): void {
    if (doc == null) return
    dispatch('select', { doc, notification: event.detail })
  }

  function calcHeight (navItem: NavigationItem): number {
    const base = 4.125
    const messageHeightPx = 2
    const reactionsHeightPx = 4
    let res = base
    if (navItem.type === 'modern') {
      for (const n of navItem.context.notifications ?? []) {
        if (n.type === NotificationType.Message) {
          res += messageHeightPx
        } else if (n.type === NotificationType.Reaction) {
          res += reactionsHeightPx
        }
      }
    } else {
      for (const n of navItem.notifications) {
        if (isReactionNotification(n)) {
          res += reactionsHeightPx
        } else {
          res += messageHeightPx
        }
      }
    }

    return res
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  id={navItem.type === 'modern' ? navItem.context.id : navItem.context._id}
  class="inbox-card"
  class:selected
  style:height={`${calcHeight(navItem)}rem`}
  on:click={() => {
    if (doc == null) return
    dispatch('select', { doc })
  }}
>
  {#if isLoading}
    <div class="loading">
      <Loading />
    </div>
  {:else if doc}
    <div class="inbox-card__header">
      <InboxCardIcon {doc} count={total ?? 0} />
      <InboxCardTitle {doc} {navItem} />
      {#if account.role !== AccountRole.ReadOnlyGuest}
        <div class="inbox-card__remove">
          {#if isRemoving}
            <Spinner size="small" />
          {:else}
            <CheckBox kind="todo" size="medium" on:value={handleToggle} />
          {/if}
        </div>
      {/if}
    </div>

    <div class="inbox-card__content">
      <div class="inbox-card__notifications">
        {#if navItem.type === 'modern'}
          <ModernNotifications doc={asCard(doc)} context={navItem.context} on:click={onNotification} />
        {:else}
          <LegacyNotifications {doc} notifications={navItem.notifications} {viewlets} on:click={onNotification} />
        {/if}
      </div>
    </div>
  {:else}
    <div class="inbox-card__header">
      Oops looks like this card is no longer available.
      {#if account.role !== AccountRole.ReadOnlyGuest}
        <div class="inbox-card__remove">
          {#if isRemoving}
            <Spinner size="small" />
          {:else}
            <CheckBox kind="todo" size="medium" on:value={handleToggle} />
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .loading {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .inbox-card {
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: pointer;
    padding: 0.5rem;
    border-bottom: 1px solid var(--global-ui-BorderColor);
    min-height: 5.625rem;

    &.selected {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }

    &:hover:not(.selected) {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: var(--spacing-0_5);
      height: 2.5rem;
      min-height: 2.5rem;
      max-height: 2.5rem;
    }

    &__remove {
      display: flex;
      align-items: center;
      margin-left: auto;
      min-width: 1.5rem;
    }

    &__content {
      display: flex;
      width: 100%;
      padding-left: 0.5rem;
    }

    &__notifications {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      margin-top: var(--spacing-1);
    }
  }
</style>
