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
    restoreLocation,
    closePanel,
    Component
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { chatId } from '@hcengineering/chat'
  import { Ref } from '@hcengineering/core'
  import view from '@hcengineering/view'
  import { Favorites } from '@hcengineering/card-resources'

  import ChatNavigation from './ChatNavigation.svelte'
  import {
    navigateToCard,
    getCardIdFromLocation,
    navigateToType,
    getTypeIdFromLocation,
    isAllLocation,
    isFavoritesLocation,
    navigateToFavorites,
    navigateToAll
  } from '../location'
  import ChatNavigationCategoryList from './ChatNavigationCategoryList.svelte'

  type Selection =
    | {
      type: 'card'
      _id: Ref<Card>
      doc: Card
    }
    | {
      type: 'type'
      _id: Ref<MasterTag>
      doc: MasterTag
    }
    | { type: 'favorites' }
    | { type: 'all' }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let replacedPanelElement: HTMLElement
  let selection: Selection | undefined = undefined
  let needRestoreLoc = true

  $: selectedCard = getSelectedCard(selection)
  $: selectedType = getSelectedType(selection)

  async function syncLocation (loc: Location): Promise<void> {
    if (loc.path[2] !== chatId) {
      return
    }

    const typeId = getTypeIdFromLocation(loc)
    const cardId = getCardIdFromLocation(loc)
    const isFavorites = isFavoritesLocation(loc)
    const isAll = isAllLocation(loc)

    if (isFavorites) {
      selection = { type: 'favorites' }
      return
    }

    if (isAll) {
      selection = { type: 'all' }
      return
    }

    const type = typeId != null ? await client.findOne(cardPlugin.class.MasterTag, { _id: typeId }) : undefined

    if (type != null) {
      selection = { type: 'type', _id: type._id, doc: type }
      return
    }

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
      selection = card != null ? { type: 'card', _id: cardId, doc: card } : undefined
    }
  }

  function selectCard (event: CustomEvent<Card>): void {
    if (selection?.type === 'card' && selection._id === event.detail._id) return
    closePanel(false)
    const card = event.detail
    selection = { type: 'card', _id: card._id, doc: card }
    navigateToCard(card._id)
  }

  function selectType (event: CustomEvent<MasterTag>): void {
    if (selection?.type === 'type' && selection._id === event.detail._id) return
    closePanel(false)
    const type = event.detail
    selection = { type: 'type', _id: type._id, doc: type }
    navigateToType(type._id)
  }

  function selectFavorites (): void {
    if (selection?.type === 'favorites') return
    closePanel(false)
    selection = { type: 'favorites' }
    navigateToFavorites()
  }

  function selectAll (): void {
    if (selection?.type === 'all') return
    closePanel(false)
    selection = { type: 'all' }
    navigateToAll()
  }

  function getSelectedCard (selection: Selection | undefined): Card | undefined {
    if (selection?.type !== 'card') return undefined
    return selection.doc
  }

  function getSelectedType (selection: Selection | undefined): Ref<MasterTag> | undefined {
    if (selection?.type !== 'type') return undefined
    return selection._id
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

<div class="hulyPanels-container chat">
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
          special={selection?.type}
          on:selectCard={selectCard}
          on:selectType={selectType}
          on:favorites={selectFavorites}
          on:selectAll={selectAll}
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
    {#if selection?.type === 'favorites'}
      {#key selection.type}
        <Favorites application={chatId} />
      {/key}
    {:else if selectedCard}
      {@const panelComponent = hierarchy.classHierarchyMixin(selectedCard._class, view.mixin.ObjectPanel)}
      {@const comp = panelComponent?.component ?? view.component.EditDoc}
      <Component is={comp} props={{ _id: selectedCard._id, readonly: false, embedded: true, allowClose: false }} />
    {:else if selectedType}
      <ChatNavigationCategoryList type={selectedType} />
    {:else if selection?.type === 'all'}
      <Component is={cardPlugin.component.CardFeedView} />
    {/if}
  </div>
</div>

<style lang="scss">
  .chat {
    background: var(--theme-navpanel-color);
    border-color: var(--theme-divider-color);
  }

  .chat__navigator {
    background: var(--theme-navpanel-color);
    border-color: var(--theme-divider-color);
  }

  .chat__panel {
    background: var(--theme-panel-color);
    border-color: var(--theme-divider-color);
    position: relative;
  }
</style>
