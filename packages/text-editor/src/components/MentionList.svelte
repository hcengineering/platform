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

  function updateStyle (): void {
    const rect = clientRect()
    const docW = document.body.clientWidth
    let tempStyle = ''
    if (rect.top < 292) // 20rem - 1.75rem
      tempStyle = `top: calc(${rect.bottom}px + .75rem); max-heigth: calc(100vh - ${rect.bottom}px - 1.75rem); `
    else tempStyle = `bottom: calc(100vh - ${rect.top}px + .75rem); max-heigth: calc(${rect.top}px - 1.75rem); `
    if (docW - rect.left > 452) // 30rem - 1.75rem
      tempStyle += `left: ${rect.left}px;`
    else tempStyle += `right: calc(100vw - ${rect.right}px);`
    style = tempStyle
  }

  let style = 'visibility: hidden'
  $: if (popup) updateStyle()

  async function updateItems (category: ObjectSearchCategory, query: string): Promise<void> {
    const f = await getResource(category.query)
    items = await f(client, query)
    if (selected > items.length) {
      selected = 0
    }
  }
  $: updateItems(category, query)
</script>

<svelte:window on:resize={() => updateStyle()} />
<div
  class="overlay"
  on:click={() => {
    close()
  }}
/>
<div bind:this={popup} class="antiPopup antiPopup-withHeader antiPopup-withCategory completion" {style} on:keydown={onKeyDown}>
  <div class="ap-category">
    {#each categories as c}
      <div class="ap-categoryItem" class:selected={category.label === c.label}>
        <ActionIcon label={c.label} icon={c.icon} size={'medium'} action={() => {
          category = c
          onCategory(c)
          updateItems(c, query)
        } }/>
      </div>
    {/each}
  </div>
  <div class="ap-header">
    <EditWithIcon icon={IconSearch} bind:value={query} on:input={() => updateItems(category, query) } placeholder={category.label} />
    <div class="ap-caption"><Label label={plugin.string.Suggested} /></div>
  </div>
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#each items as item, i}
        <div
          class="ap-menuItem"
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
      {#if !items.length}
        <div class="ap-menuItem empty"><Label label={plugin.string.NoItems} /></div>
      {/if}
    </div>
  </div>
  <div class="ap-space" />
</div>

<style lang="scss">
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 1999;
  }

  .completion {
    position: absolute;
    min-width: 20rem;
    max-width: 30rem;
    min-height: 0;
    height: 20rem;
    z-index: 2000;
  }
</style>
