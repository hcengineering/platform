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
  import cardPlugin, { Card } from '@hcengineering/card'
  import {
    defineSeparators,
    Separator,
    deviceOptionsStore as deviceInfo,
    resolvedLocationStore,
    Location,
    restoreLocation
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { createNotificationContextsQuery, createQuery, getClient } from '@hcengineering/presentation'
  import { chatId } from '@hcengineering/chat'
  import { SortingOrder } from '@hcengineering/core'
  import { NotificationContext } from '@hcengineering/communication-types'

  import ChatPanel from './ChatPanel.svelte'
  import ChatNavigation from './ChatNavigation.svelte'
  import { navigateToCard, getCardIdFromLocation } from '../location'

  const client = getClient()

  const query = createQuery()
  const notificationContextsQuery = createNotificationContextsQuery()

  let replacedPanelElement: HTMLElement
  let card: Card | undefined = undefined
  let needRestoreLoc = true

  let cards: Card[] = []
  let contexts: NotificationContext[] = []

  // TODO: only subscribed cards
  query.query(cardPlugin.class.Card, {}, (res) => {
    cards = res
  })

  // TODO: only for subscribed cards
  notificationContextsQuery.query(
    {
      notifications: {
        order: SortingOrder.Descending,
        read: false,
        limit: 10
      }
    },
    (res) => {
      contexts = res.getResult()
    }
  )

  async function syncLocation (loc: Location): Promise<void> {
    if (loc.path[2] !== chatId) {
      return
    }

    const cardId = getCardIdFromLocation(loc)

    if (cardId == null || cardId === '') {
      card = undefined
      if (needRestoreLoc) {
        needRestoreLoc = false
        restoreLocation(loc, chatId)
      }
      return
    }

    needRestoreLoc = false

    if (cardId !== card?._id) {
      card = await client.findOne(cardPlugin.class.Card, { _id: cardId })
    }
  }

  function selectCard (event: CustomEvent<Card>): void {
    card = event.detail
    navigateToCard(card._id)
  }

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void syncLocation(loc)
    })
  )

  defineSeparators('new-chat', [
    { minSize: 10, maxSize: 60, size: 30, float: 'navigator' },
    { size: 'auto', minSize: 20, maxSize: 'auto' }
  ])

  $: $deviceInfo.replacedPanel = replacedPanelElement
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

<div class="hulyPanels-container chat next-colors">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left chat__navigator"
      class:fly={$deviceInfo.navigator.float}
    >
      <div class="antiPanel-wrap__content hulyNavPanel-container">
        <ChatNavigation {card} {cards} {contexts} on:select={selectCard} />
      </div>
      {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
        <Separator name="new-chat" float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} />
      {/if}
    </div>
    <Separator
      name="new-chat"
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}
  <div bind:this={replacedPanelElement} class="hulyComponent chat__panel">
    {#if card}
      {@const context = contexts.find((c) => c.card === card?._id)}
      {#key card._id}
        <ChatPanel {card} {context} />
      {/key}
    {/if}
  </div>
</div>

<style lang="scss">
  .chat {
    background: var(--next-background-color);
    border-color: var(--next-border-color);
    font-family: 'Inter Display', sans-serif;
  }

  .chat__navigator {
    background: var(--next-background-color);
    border-color: var(--next-border-color);
  }

  .chat__panel {
    background: var(--next-panel-color-background);
    border-color: var(--next-panel-color-border);
    position: relative;
  }
</style>
