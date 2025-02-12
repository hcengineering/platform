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
  import { Card } from '@hcengineering/card'
  import { defineSeparators, Separator, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import ChatPanel from './ChatPanel.svelte'
  import ChatNavigation from './ChatNavigation.svelte'
  import { navigateToCard } from '../navigation'

  let replacedPanelElement: HTMLElement

  let card: Card | undefined = undefined

  async function selectCard (event: CustomEvent<Card>): Promise<void> {
    card = event.detail
    await navigateToCard(card)
  }

  defineSeparators('new-chat', [
    { minSize: 10, maxSize: 60, size: 30, float: 'navigator' },
    { size: 'auto', minSize: 20, maxSize: 'auto' }
  ])

  $: $deviceInfo.replacedPanel = replacedPanelElement
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))
</script>

<div class="hulyPanels-container chat">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left chat__navigator"
      class:fly={$deviceInfo.navigator.float}
    >
      <div class="antiPanel-wrap__content hulyNavPanel-container">
        <ChatNavigation {card} on:select={selectCard} />
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
      <ChatPanel />
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
  }
</style>
