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
  import {
    defineSeparators,
    Separator,
    deviceOptionsStore as deviceInfo,
    resolvedLocationStore,
    Location,
    restoreLocation
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { createNotificationContextsQuery, getClient } from '@hcengineering/presentation'
  import { chatId } from '@hcengineering/chat'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { NotificationContext } from '@hcengineering/communication-types'

  import ChatPanel from './ChatPanel.svelte'
  import ChatNavigation from './ChatNavigation.svelte'
  import { navigateToCard, getCardIdFromLocation, navigateToType, getTypeIdFromLocation } from '../location'
  import ChatNavigationCategoryList from './ChatNavigationCategoryList.svelte'

  type Selection = { type: 'card', card: Card } | { type: 'type', ref: Ref<MasterTag> }

  const client = getClient()

  const notificationContextsQuery = createNotificationContextsQuery()

  let replacedPanelElement: HTMLElement
  let selection: Selection | undefined = undefined
  let needRestoreLoc = true

  let contexts: NotificationContext[] = []

  $: selectedCard = getSelectedCard(selection)
  $: selectedType = getSelectedType(selection)

  // TODO: only for subscribed/loaded cards
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

    const typeId = getTypeIdFromLocation(loc)

    if (typeId != null && typeId !== '') {
      selection = { type: 'type', ref: typeId }
      return
    }

    const cardId = getCardIdFromLocation(loc)

    if (cardId == null || cardId === '') {
      selection = undefined
      if (needRestoreLoc) {
        needRestoreLoc = false
        restoreLocation(loc, chatId)
      }
      return
    }

    needRestoreLoc = false

    if (cardId !== selectedCard?._id) {
      const card = await client.findOne(cardPlugin.class.Card, { _id: cardId })
      selection = card != null ? { type: 'card', card } : undefined
    }
  }

  function selectCard (event: CustomEvent<Card>): void {
    const card = event.detail
    selection = { type: 'card', card }
    navigateToCard(card._id)
  }

  function selectType (event: CustomEvent<Ref<MasterTag>>): void {
    const type = event.detail
    selection = { type: 'type', ref: type }
    navigateToType(type)
  }

  function getSelectedCard (selection: Selection | undefined): Card | undefined {
    if (selection == null) return undefined
    if (selection.type !== 'card') return undefined
    return selection.card
  }

  function getSelectedType (selection: Selection | undefined): Ref<MasterTag> | undefined {
    if (selection == null) return undefined
    if (selection.type !== 'type') return undefined
    return selection.ref
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
        <ChatNavigation
          card={getSelectedCard(selection)}
          type={getSelectedType(selection)}
          {contexts}
          on:selectCard={selectCard}
          on:selectType={selectType}
        />
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
    {#if selectedCard}
      {@const context = contexts.find((c) => c.card === selectedCard?._id)}
      <ChatPanel card={selectedCard} {context} />
    {:else if selectedType}
      <ChatNavigationCategoryList type={selectedType} />
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
