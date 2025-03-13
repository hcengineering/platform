<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { NotificationContext, Notification } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { createEventDispatcher } from 'svelte'

  import InboxNotification from './InboxNotification.svelte'
  import InboxCardIcon from './InboxCardIcon.svelte'

  export let context: NotificationContext
  export let card: Card
  export let selected: boolean = false

  const dispatch = createEventDispatcher()

  let displayNotifications: Notification[] = []
  $: displayNotifications = (context.notifications ?? []).filter((it) => it.message != null).slice(0, 3)
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="card"
  class:selected
  on:click={() => {
    dispatch('select', { context, card })
  }}
>
  <div class="header">
    <InboxCardIcon {card} count={context.notifications?.filter((x) => !x.read)?.length ?? 0} />
    <div class="labels">
      <span class="title overflow-label clear-mins" title={card.title}>
        {card.title}
      </span>
    </div>
  </div>
  <div class="content">
    <div class="notifications">
      {#each displayNotifications as notification (notification.messageId)}
        <InboxNotification {notification} />
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
    min-height: 5.625rem;

    &.selected {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }

    &:hover:not(.selected) {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }

    .header {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: var(--spacing-0_5);
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
