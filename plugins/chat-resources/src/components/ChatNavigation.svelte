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
  import { createEventDispatcher } from 'svelte'
  import { NavigationList, NavigationSection } from '@hcengineering/ui-next'
  import { languageStore, Scroller } from '@hcengineering/ui'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { SavedView } from '@hcengineering/workbench-resources'
  import { chatId } from '@hcengineering/chat'
  import { createQuery, LiveQuery } from '@hcengineering/presentation'

  import { cardsToChatSections, NavigatorState, navigatorStateStore, toggleSection } from '../navigator'

  export let card: Card | undefined = undefined
  export let type: Ref<MasterTag> | undefined = undefined
  export let contexts: NotificationContext[] = []

  const cardsLimit = 8
  const dispatch = createEventDispatcher()

  const cardsQueryByType = new Map<Ref<MasterTag>, { query: LiveQuery, limit: number }>()
  const typesQuery = createQuery()

  let cardsByType = new Map<Ref<MasterTag>, { cards: Card[], total: number }>()
  let types: MasterTag[] = []

  let sections: NavigationSection[] = []

  $: typesQuery.query(cardPlugin.class.MasterTag, {}, (result) => {
    types = result.filter((p) => p.removed !== true)
  })

  $: loadObjects(types)

  function loadObjects (types: MasterTag[]): void {
    if (types.length === 0) return
    for (const type of types) {
      const { query, limit } = cardsQueryByType.get(type._id) ?? {
        query: createQuery(),
        limit: cardsLimit
      }

      cardsQueryByType.set(type._id, { query, limit })

      query.query(
        type._id,
        {},
        (res) => {
          if (res.length === 0) {
            cardsByType.delete(type._id)
          } else {
            cardsByType.set(type._id, { cards: res as any, total: res.total })
          }

          cardsByType = cardsByType
        },
        { total: true, limit, sort: { modifiedOn: SortingOrder.Descending } }
      )
    }

    cardsByType = cardsByType
  }

  $: void updateSections(cardsByType, contexts, $languageStore, $navigatorStateStore)
  async function updateSections (
    cards: Map<Ref<MasterTag>, { cards: Card[], total: number }>,
    contexts: NotificationContext[],
    _lang: string,
    state: NavigatorState
  ): Promise<void> {
    sections = await cardsToChatSections(cards, contexts, state)
  }

  function handleSectionToggle (event: CustomEvent<string>): void {
    toggleSection(event.detail)
  }

  function handleSelectCard (event: CustomEvent<Ref<Card>>): void {
    const cardId = event.detail

    if (card != null && cardId === card._id) {
      return
    }

    const newCard = Array.from(cardsByType.values())
      .flatMap((it) => it.cards)
      .find((it) => it._id === cardId)

    if (newCard !== undefined) {
      dispatch('selectCard', newCard)
    }
  }

  function handleAll (event: CustomEvent<Ref<MasterTag>>): void {
    const query = cardsQueryByType.get(event.detail)
    if (query !== undefined) {
      query.limit += cardsLimit
      loadObjects(types)
    }
  }
</script>

<Scroller shrink>
  <div class="chat-navigation">
    <SavedView alias={chatId} />
    <NavigationList
      {sections}
      selectedItem={card?._id}
      selectedSection={type}
      on:toggle={handleSectionToggle}
      on:selectItem={handleSelectCard}
      on:select={(ev) => dispatch('selectType', ev.detail)}
      on:all={handleAll}
    />
  </div>
</Scroller>

<style lang="scss">
  .chat-navigation {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0 8px;
    margin-top: 1rem;
  }
</style>
