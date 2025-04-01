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
    restoreLocation,
    Component
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { getClient, getCommunicationClient } from '@hcengineering/presentation'
  import { inboxId } from '@hcengineering/inbox'
  import view from '@hcengineering/view'
  import { NotificationContext } from '@hcengineering/communication-types'

  import InboxNavigation from './InboxNavigation.svelte'
  import { getCardIdFromLocation, navigateToCard } from '../location'

  const client = getClient()
  const communicationClient = getCommunicationClient()

  let replacedPanelElement: HTMLElement
  let card: Card | undefined = undefined
  let needRestoreLoc = true

  async function syncLocation (loc: Location): Promise<void> {
    if (loc.path[2] !== inboxId) {
      return
    }

    const cardId = getCardIdFromLocation(loc)

    if (cardId == null || cardId === '') {
      card = undefined
      if (needRestoreLoc) {
        needRestoreLoc = false
        restoreLocation(loc, inboxId)
      }
      return
    }

    needRestoreLoc = false

    if (cardId !== card?._id) {
      card = await client.findOne(cardPlugin.class.Card, { _id: cardId })
    }
  }

  async function readCard (context: NotificationContext): Promise<void> {
    const lastView = context.notifications?.[0]?.created
    if (lastView == null) return
    await communicationClient.updateNotificationContext(context.id, lastView)
  }

  function selectCard (event: CustomEvent<{ context: NotificationContext, card: Card }>): void {
    if (card?._id === event.detail.card._id) return
    card = event.detail.card
    void readCard(event.detail.context)
    navigateToCard(card._id)
  }

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void syncLocation(loc)
    })
  )

  defineSeparators('new-inbox', [
    { minSize: 10, maxSize: 60, size: 30, float: 'navigator' },
    { size: 'auto', minSize: 20, maxSize: 'auto' }
  ])

  $: $deviceInfo.replacedPanel = replacedPanelElement
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

<div class="hulyPanels-container inbox next-colors">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left inbox__navigator"
      class:fly={$deviceInfo.navigator.float}
    >
      <div class="antiPanel-wrap__content hulyNavPanel-container">
        <InboxNavigation {card} on:select={selectCard} />
      </div>
      {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
        <Separator name="new-inbox" float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} />
      {/if}
    </div>
    <Separator
      name="new-inbox"
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}
  <div bind:this={replacedPanelElement} class="hulyComponent inbox__panel">
    {#if card}
      {@const panel = client.getHierarchy().classHierarchyMixin(card._class, view.mixin.ObjectPanel)}
      <Component
        is={panel?.component ?? view.component.EditDoc}
        props={{
          _id: card._id,
          embedded: true
        }}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .inbox {
    background: var(--next-background-color);
    border-color: var(--next-border-color);
    font-family: 'Inter Display', sans-serif;
  }

  .inbox__navigator {
    background: var(--next-background-color);
    border-color: var(--next-border-color);
  }

  .inbox__panel {
    //background: var(--next-panel-color-background);
    //border-color: var(--next-panel-color-border);
    position: relative;
  }
</style>
