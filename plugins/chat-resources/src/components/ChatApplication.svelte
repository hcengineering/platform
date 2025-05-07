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
    Component
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { chatId } from '@hcengineering/chat'
  import { Ref, Doc, Class } from '@hcengineering/core'
  import view from '@hcengineering/view'

  import ChatNavigation from './ChatNavigation.svelte'
  import { navigateToCard, getCardIdFromLocation, navigateToType, getTypeIdFromLocation } from '../location'
  import ChatNavigationCategoryList from './ChatNavigationCategoryList.svelte'

  interface Selection {
    _class: Ref<Class<Doc>>
    _id: Ref<Doc>
    doc: Doc
  }

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
    const type = typeId != null ? await client.findOne(cardPlugin.class.MasterTag, { _id: typeId }) : undefined

    if (type != null) {
      selection = { _class: cardPlugin.class.MasterTag, _id: type._id, doc: type }
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
      selection = card != null ? { _class: cardPlugin.class.Card, _id: cardId, doc: card } : undefined
    }
  }

  function selectCard (event: CustomEvent<Card>): void {
    if (selection?._id === event.detail._id) return
    const card = event.detail
    selection = { _class: cardPlugin.class.Card, _id: card._id, doc: card }
    navigateToCard(card._id)
  }

  function selectType (event: CustomEvent<MasterTag>): void {
    if (selection?._id === event.detail._id) return
    const type = event.detail
    selection = { _class: cardPlugin.class.MasterTag, _id: type._id, doc: type }
    navigateToType(type._id)
  }

  function getSelectedCard (selection: Selection | undefined): Card | undefined {
    if (selection == null) return undefined
    if (selection._class !== cardPlugin.class.Card) return undefined
    return selection.doc as Card | undefined
  }

  function getSelectedType (selection: Selection | undefined): Ref<MasterTag> | undefined {
    if (selection == null) return undefined
    if (selection._class !== cardPlugin.class.MasterTag) return undefined
    return selection._id as Ref<MasterTag>
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
      {@const panelComponent = hierarchy.classHierarchyMixin(selectedCard._class, view.mixin.ObjectPanel)}
      {@const comp = panelComponent?.component ?? view.component.EditDoc}
      <Component is={comp} props={{ _id: selectedCard._id, readonly: false, embedded: true, allowClose: false }} />
    {:else if selectedType}
      <ChatNavigationCategoryList type={selectedType} />
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
