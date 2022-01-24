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
  import { getResource } from '@anticrm/platform'
  import { getClient, ObjectSearchCategory, ObjectSearchResult } from '@anticrm/presentation'
  import { ActionIcon, EditWithIcon, IconSearch, Label, showPopup } from '@anticrm/ui'
  import { onDestroy, onMount } from 'svelte'
  import plugin from '../plugin'
  import DummyPopup from './DummyPopup.svelte'
  
  export let query: string = ''
  export let items: ObjectSearchResult[]
  export let clientRect: () => ClientRect
  export let command: (props: any) => void
  export let close: () => void
  export let categories: ObjectSearchCategory[]
  export let category: ObjectSearchCategory
  
  export let onCategory: (cat: ObjectSearchCategory) => void

  const client = getClient()
  let popup: HTMLDivElement
  let selected = 0
  let popupClose: () => void

  onMount(() => {
    popupClose = showPopup(DummyPopup, {}, undefined, () => {
      close()
    })
  })

  onDestroy(() => {
    popupClose()
  })

  function dispatchItem (item: ObjectSearchResult): void {
    command({ id: item.doc._id, label: item.title, objectclass: item.doc._class })
  }

  export function onKeyDown (ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') {
      if (selected < items.length - 1) selected++
      return true
    }
    if (ev.key === 'ArrowUp') {
      if (selected > 0) selected--
      return true
    }
    if (ev.key === 'Tab') {
      const pos = categories.indexOf(category)
      category = categories[(pos + 1) % categories.length]
      return true
    }
    if (ev.key === 'Enter') {
      const item = items[selected]
      if (item) {
        dispatchItem(item)
        return true
      } else {
        return false
      }
    }
    return false
  }

  export function done () {
  }

  function updateStyle (popup: HTMLDivElement): void {
    const x = clientRect().left
    const height = popup.getBoundingClientRect().height
    const y = clientRect().top - height - 16
    style = `left: ${x}px; top: ${y}px;`
  }

  let style = 'visibility: hidden'
  $: if (popup) {
    updateStyle(popup)
  }

  async function updateItems (category: ObjectSearchCategory, query: string): Promise<void> {
    const f = await getResource(category.query)
    items = await f(client, query)
    if (selected > items.length) {
      selected = 0
    }
  }
  $: updateItems(category, query)
</script>

<div>
  <div bind:this={popup} class="completion" {style} on:keydown={onKeyDown}>
    <div class='category-container'>
      {#each categories as c}
        <div class='category-selector' class:selected={category.label === c.label}>
          <ActionIcon label={c.label} icon={c.icon} size={'medium'} action={() => {
            category = c
            onCategory(c)
            updateItems(c, query)
          } }/>
        </div>
      {/each}
    </div>
    <div class='mt-4 mb-4'>
      <EditWithIcon icon={IconSearch} bind:value={query} on:input={() => updateItems(category, query) } placeholder={category.label} />
    </div>
    <Label label={plugin.string.Suggested}/>
    <div class="scroll mt-2">
      {#each items as item, i}
        <div
          class="item"
          class:selected={i === selected}
          on:click={() => {
            dispatchItem(item)
          }}
          on:focus={() => {
            selected = i
          }}
          on:mouseover={() => {
            selected = i
          }}
        >
          <svelte:component this={item.component} value={item.doc} {...item.componentProps ?? {}} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .selected {
    background-color: var(--theme-button-bg-focused);
  }

  .completion {
    position: absolute;
    z-index: 2010;
    min-width: 300px;
    height: 332px;
    padding: 16px;
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-bg-accent-hover);
    border-radius: 0.75rem;
    box-shadow: 0 20px 20px 0 rgba(0, 0, 0, 0.1);

    .caption {
      margin: 8px 0;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.5px;
      color: var(--theme-content-trans-color);
    }
    .scroll {
      max-height: calc(300px - 128px);
      display: grid;
      grid-auto-flow: row;
      gap: 12px;
      overflow-y: auto;
    }
  }

  .category-container {
    display: flex;
    .category-selector {
      margin-right: 1rem;
      opacity: 0.7;
      &.selected {
        opacity: 1;
      }
    }
  }
</style>
