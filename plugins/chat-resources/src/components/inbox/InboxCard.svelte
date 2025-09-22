<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->

<script lang="ts">
  import { NotificationContext } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { createEventDispatcher } from 'svelte'
  import { createNotificationsQuery, getCommunicationClient } from '@hcengineering/presentation'
  import { CheckBox, Spinner } from '@hcengineering/ui'
  import { AccountRole, getCurrentAccount } from '@hcengineering/core'

  import InboxNotification from './InboxNotification.svelte'
  import InboxCardIcon from './InboxCardIcon.svelte'

  export let context: NotificationContext
  export let card: Card
  export let selected: boolean = false

  const account = getCurrentAccount()
  const dispatch = createEventDispatcher()
  const communicationClient = getCommunicationClient()

  const notificationsQuery = createNotificationsQuery()

  let total = 0

  notificationsQuery.query({ limit: 1, total: true, read: false, strict: true, context: context.id }, (res) => {
    total = res.getTotal()
  })

  let isRemoving = false
  async function handleToggle (): Promise<void> {
    isRemoving = true
    try {
      await communicationClient.removeNotificationContext(context.id)
    } finally {
      isRemoving = false
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="inbox-card" class:selected on:click={() => dispatch('select', { context, card })}>
  <div class="inbox-card__header">
    <InboxCardIcon {card} count={total ?? 0} />
    <div class="inbox-card__labels">
      <span class="inbox-card__title overflow-label clear-mins" title={card.title}>
        {card.title}
      </span>
    </div>
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
      {#each context.notifications ?? [] as notification}
        <div class="inbox-card__notification">
          <div class="inbox-card__marker" />
          <InboxNotification {notification} {card} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
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
    }

    &__labels {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
      color: var(--global-primary-TextColor);
      font-size: 0.875rem;
      overflow: hidden;
    }

    &__title {
      font-weight: 400;
      color: var(--global-primary-TextColor);
      overflow: hidden;
      text-overflow: ellipsis;
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

    &__notification {
      position: relative;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      user-select: none;

      &:first-child .inbox-card__marker {
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
      }

      &:last-child .inbox-card__marker {
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
      }

      &:hover .inbox-card__marker {
        border-radius: 0.5rem;
        background: var(--global-primary-LinkColor);
      }
    }

    &__marker {
      position: absolute;
      width: 0.25rem;
      height: 100%;
      background: var(--global-ui-highlight-BackgroundColor);
      border-radius: 0;
    }
  }
</style>
