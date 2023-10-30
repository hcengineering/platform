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
  import {
    AnySvelteComponent,
    createFocusManager,
    FocusHandler,
    Label,
    ListView,
    resizeObserver
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation, { getClient, ObjectSearchCategory } from '@hcengineering/presentation'

  import { Class, Ref, Doc, IndexedDoc } from '@hcengineering/core'

  export let query: string = ''

  type SearchSection = { category: ObjectSearchCategory; items: IndexedDoc[] }
  type SearchItem = {
    num: number
    item: IndexedDoc
    category: ObjectSearchCategory
    component: AnySvelteComponent
  }

  let items: SearchItem[] = []
  let categories: ObjectSearchCategory[] = []
  const components: Map<Ref<Class<Doc>>, AnySvelteComponent> = new Map()

  const client = getClient()

  client.findAll(presentation.class.ObjectSearchCategory, { context: 'mention' }).then(async (results) => {
    for (const cat of results) {
      if (cat.classToSearch !== undefined && cat.component !== undefined) {
        components.set(cat.classToSearch, await getResource(cat.component))
      }
    }

    categories = results
    updateItems(query)
  })

  const dispatch = createEventDispatcher()

  let list: ListView
  let scrollContainer: HTMLElement
  let selection = 0

  const titles = new Map<string, string>()
  function titleHandler (doc: IndexedDoc) {
    return (event: CustomEvent) => {
      const title = event.detail
      titles.set(doc.id, title)
    }
  }

  function dispatchItem (item: IndexedDoc): void {
    const title = titles.get(item.id)
    if (title !== undefined) {
      dispatch('close', {
        id: item.id,
        label: title,
        objectclass: item._class
      })
    }
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
      return true
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

      if (category.classToSearch !== undefined) {
        const component = components.get(category.classToSearch)
        if (component !== undefined) {
          results = results.concat(
            items.map((item, num) => {
              return { num, category, component, item }
            })
          )
        }
      }
    }
    return results
  }

  function findCategoryByClass (
    categories: ObjectSearchCategory[],
    _class: Ref<Class<Doc>>
  ): ObjectSearchCategory | undefined {
    for (const category of categories) {
      if (category.classToSearch === _class) {
        return category
      }
    }
    return undefined
  }

  async function doFulltextSearch (classes: Ref<Class<Doc>>[], query: string): Promise<SearchSection[]> {
    const result = await client.searchFulltext(
      {
        query: `${query}*`,
        classes
      },
      {
        limit: 10
      }
    )

    const itemsByClass = new Map<Ref<Class<Doc>>, IndexedDoc[]>()
    for (const item of result.docs) {
      const list = itemsByClass.get(item._class)
      if (list === undefined) {
        itemsByClass.set(item._class, [item])
      } else {
        list.push(item)
      }
    }

    const sections: SearchSection[] = []
    for (const [_class, items] of itemsByClass.entries()) {
      const category = findCategoryByClass(categories, _class)
      if (category !== undefined) {
        // && category.component !== undefined
        sections.push({ category, items })
      }
    }

    return sections
  }

  async function updateItems (query: string): Promise<void> {
    const classesToSearch: Ref<Class<Doc>>[] = []
    for (const cat of categories) {
      if (cat.classToSearch !== undefined) {
        classesToSearch.push(cat.classToSearch)
      }
    }

    const sections = await doFulltextSearch(classesToSearch, query)
    items = packSearchResultsForListView(sections)
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
          {@const item = items[num]}
          {@const doc = item.item}
          <div class="ap-menuItem withComp" on:click={() => dispatchItem(doc)}>
            <svelte:component this={item.component} value={doc} on:title={titleHandler(doc)} />
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
