<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { type Ref, SortingOrder } from '@hcengineering/core'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import textEditor from '@hcengineering/text-editor'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Label, ListView } from '@hcengineering/ui'
  import { buildReferenceUrl } from './extension/reference'
  import document, { type Document } from '@hcengineering/document'

  export let link = ''

  const dispatch = createEventDispatcher()
  const client = getClient()
  const linkPlaceholder = getEmbeddedLabel('URL or document name')

  let items: Document[] = []
  let list: ListView
  let selection = 0
  let searchQuery = ''
  let debounceTimer: any

  function isUrl (text: string): boolean {
    if (text.length === 0) return false
    return text.includes('://') || text.startsWith('http') || text.startsWith('www.')
  }

  function save (): void {
    dispatch('update', link)
  }

  function selectItem (doc: Document): void {
    const refUrl = buildReferenceUrl({
      id: doc._id,
      objectclass: doc._class,
      label: doc.title
    })
    if (refUrl !== undefined) {
      link = refUrl
    }
  }

  async function doSearch (query: string): Promise<void> {
    if (query.length === 0 || isUrl(query)) {
      items = []
      return
    }
    try {
      const r = await client.findAll(
        document.class.Document,
        { title: { $like: `%${query}%` } },
        { limit: 10, sort: { title: SortingOrder.Ascending } }
      )
      if (query === searchQuery) {
        items = r
        selection = 0
      }
    } catch (e) {
      console.error('LinkPopup search error:', e)
      items = []
    }
  }

  function onInput (value: string): void {
    searchQuery = value
    clearTimeout(debounceTimer)
    if (value.length === 0 || isUrl(value) || value.startsWith('ref://')) {
      items = []
      return
    }
    debounceTimer = setTimeout(() => {
      void doSearch(value)
    }, 200)
  }

  $: onInput(link)

  onDestroy(() => {
    clearTimeout(debounceTimer)
  })

  function handleKeydown (event: KeyboardEvent): void {
    if (items.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      selection = Math.min(selection + 1, items.length - 1)
      list?.select(selection)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      selection = Math.max(selection - 1, 0)
      list?.select(selection)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      selectItem(items[selection])
    }
  }

  $: canSave = link === '' || link.startsWith('ref://') || URL.canParse(link)
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div on:keydown|capture={handleKeydown}>
  <Card
    label={textEditor.string.Link}
    okLabel={textEditor.string.Save}
    okAction={save}
    {canSave}
    on:close={() => {
      dispatch('close')
    }}
    on:changeContent
  >
    <EditBox placeholder={linkPlaceholder} bind:value={link} autoFocus />
    {#if items.length > 0}
      <div class="searchResults">
        <ListView bind:this={list} bind:selection count={items.length}>
          <svelte:fragment slot="item" let:item={num}>
            {@const item = items[num]}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="ap-menuItem withComp h-8"
              style="padding-left: 0.75rem; display: flex; align-items: center;"
              on:click={() => {
                selectItem(item)
              }}
            >
              <span class="overflow-label">{item.title}</span>
            </div>
          </svelte:fragment>
        </ListView>
      </div>
    {:else if searchQuery.length > 0 && !isUrl(searchQuery) && !searchQuery.startsWith('ref://')}
      <div class="noResults"><Label label={presentation.string.NoResults} /></div>
    {/if}
  </Card>
</div>

<style lang="scss">
  .searchResults {
    max-height: 15rem;
    overflow-y: auto;
    margin-top: 0.5rem;
  }

  .noResults {
    display: flex;
    padding: 0.25rem 0;
    color: var(--theme-dark-color);
  }
</style>
