<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { getResource } from '@hcengineering/platform'
  import { createFocusManager, FocusHandler, Label, ListView, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation, {
    getClient,
    hasResource,
    ObjectSearchCategory,
    ObjectSearchResult
  } from '@hcengineering/presentation'

  export let query: string = ''
  export let maxItemsPerCategory = 3

  type SearchSection = { category: ObjectSearchCategory; items: ObjectSearchResult[] }
  type SearchItem = { num: number; item: ObjectSearchResult; category: ObjectSearchCategory }

  let items: SearchItem[] = []
  let categories: ObjectSearchCategory[] = []

  const client = getClient()

  client.findAll(presentation.class.ObjectSearchCategory, { context: 'mention' }).then((r) => {
    categories = r.filter((it) => hasResource(it.query))
    updateItems(query)
  })

  const dispatch = createEventDispatcher()

  let list: ListView
  let scrollContainer: HTMLElement
  let selection = 0

  function dispatchItem (item: ObjectSearchResult): void {
    dispatch('close', item)
  }

  export function onKeyDown (key: KeyboardEvent): boolean {
    if (key.key === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list?.select(selection + 1)
      return true
    }
    if (key.key === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      if (selection === 0 && scrollContainer !== undefined) {
        scrollContainer.scrollTop = 0
      }
      list?.select(selection - 1)
    }
    if (key.key === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const searchItem = items[selection]
      if (searchItem) {
        dispatchItem(searchItem.item)
        return true
      } else {
        return false
      }
    }
    return false
  }

  export function done () {}

  function packSearchResultsForListView (sections: SearchSection[]): SearchItem[] {
    let results: SearchItem[] = []
    for (const section of sections) {
      const category = section.category
      const items = section.items

      results = results.concat(
        items.map((item, num) => {
          return { num, category, item }
        })
      )
    }
    return results
  }

  async function queryCategoryItems (category: ObjectSearchCategory, query: string): Promise<SearchSection> {
    const f = await getResource(category.query)
    return {
      category,
      items: await f(client, query, { limit: maxItemsPerCategory })
    }
  }

  async function updateItems (query: string): Promise<void> {
    const queries = []
    for (const cat of categories) {
      queries.push(queryCategoryItems(cat, query))
    }
    const results = await Promise.all(queries)
    items = packSearchResultsForListView(results)
  }
  $: updateItems(query)

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<form class="antiPopup mentionPoup" on:keydown={onKeyDown} use:resizeObserver={() => dispatch('changeSize')}>
  <div class="ap-scroll" bind:this={scrollContainer}>
    <div class="ap-box">
      {#if items.length === 0 && query !== ''}
        <div class="noResults"><Label label={presentation.string.NoResults} /></div>
      {/if}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <ListView bind:this={list} bind:selection count={items.length}>
        <svelte:fragment slot="category" let:item={num}>
          {@const item = items[num]}
          {#if item.num === 0}
            <div class="mentonCategory">
              <Label label={item.category.title} />
            </div>
            <!-- <div class="ap-subheader">
              <Label label={item.category.title} />
            </div> -->
          {/if}
        </svelte:fragment>
        <svelte:fragment slot="item" let:item={num}>
          {@const doc = items[num].item}
          <div class="ap-menuItem withComp" on:click={() => dispatchItem(doc)}>
            <svelte:component this={doc.component} value={doc.doc} {...doc.componentProps ?? {}} />
          </div>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="ap-space x2" />
</form>

<style lang="scss">
  .noResults {
    display: flex;
    padding: 0.25rem 1rem;
    align-items: center;
    align-self: stretch;
  }

  .mentionPoup {
    padding-top: 0.5rem;
  }

  .mentonCategory {
    padding: 0.5rem 1rem;
    font-size: 0.625rem;
    letter-spacing: 0.0625rem;
    color: var(--theme-dark-color);
    text-transform: uppercase;
    line-height: 1rem;
  }
</style>
