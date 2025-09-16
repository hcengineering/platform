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
  import cardPlugin, { Card, MasterTag } from '@hcengineering/card'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { NotificationType, SubscriptionLabelID } from '@hcengineering/communication-types'
  import chat, { chatId } from '@hcengineering/chat'
  import { Navigator } from '@hcengineering/card-resources'
  import communication from '@hcengineering/communication'
  import { Button, ModernButton } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { createNotificationsQuery } from '@hcengineering/presentation'

  import NotifyMarker from './inbox/NotifyMarker.svelte'
  import NavigationHeader from './NavigationHeader.svelte'
  import InboxNavigation from './inbox/InboxNavigation.svelte'
  import InboxHeader from './inbox/InboxHeader.svelte'

  export let card: Card | undefined = undefined
  export let type: Ref<MasterTag> | undefined = undefined
  export let special: 'favorites' | string | undefined = undefined
  export let mode: 'chat' | 'inbox' = 'chat'

  const dispatch = createEventDispatcher()

  let hasNewInboxNotifications: boolean = false

  const notificationCountQuery = createNotificationsQuery()

  notificationCountQuery.query({ read: false, limit: 1 }, (res) => {
    hasNewInboxNotifications = res.getResult().length > 0
  })

  function getSpecial(special: 'favorites' | string | undefined): string | undefined {
    if (special === 'favorites') {
      return 'favorites'
    }
    return undefined
  }

  function handleInboxClick(): void {
    mode = 'inbox'
  }

  function handleAllUpdatesClick(): void {
    dispatch('allUpdates')
  }

  function selectInboxCard(event: CustomEvent): void {
    const card = event.detail?.card
    if (card != null) {
      dispatch('selectCard', card)
    }
  }
</script>

{#if mode === 'inbox'}
  <InboxHeader bind:mode />
  <InboxNavigation {card} on:select={selectInboxCard} />
{:else}
  <div class="chat-navigator">
    <NavigationHeader label={chat.string.Chat}>
      <div slot="actions" class="flex-row-center">
        <ModernButton
          icon={chat.icon.Inbox}
          label={chat.string.Inbox}
          size="small"
          iconSize="small"
          on:click={handleInboxClick}
        >
          {#if hasNewInboxNotifications}
            <div class="flex pl-0-5">
              <NotifyMarker kind="simple" size="xx-small" />
            </div>
          {/if}
        </ModernButton>
      </div>
    </NavigationHeader>
    <div class="after-header">
      <Button
        icon={chat.icon.All}
        label={chat.string.All}
        kind="ghost"
        size="medium"
        width="100%"
        justify="left"
        on:click={handleAllUpdatesClick}
      />
    </div>
    <Navigator
      config={{
        variant: 'cards',
        types: [cardPlugin.class.Card],
        savedViews: true,
        groupBySpace: false,
        hideEmpty: true,
        limit: 5,
        labelFilter: [SubscriptionLabelID],
        preorder: [
          { type: chat.masterTag.Thread, order: 1 },
          { type: communication.type.Direct, order: 2 }
        ],
        fixedTypes: [chat.masterTag.Thread, communication.type.Direct],
        specialSorting: {
          [communication.type.Direct]: 'alphabetical'
        },
        allowCreate: true,
        defaultSorting: 'recent',
        lookback: '2w',
        showTypeIcon: false,
        showCardIcon: true
      }}
      applicationId={chatId}
      selectedType={type}
      selectedCard={card?._id}
      selectedSpecial={getSpecial(special)}
      on:selectType
      on:selectCard
      on:favorites
    />
  </div>
{/if}

<style lang="scss">
  .after-header {
    display: flex;
    padding: 0.5rem 0.5rem 0 0.5rem;
  }
</style>
