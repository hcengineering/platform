<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { IntlString, translate } from '@hcengineering/platform'

  import type { DropdownIntlItem } from '../types'
  import IconCheck from './icons/Check.svelte'
  import Label from './Label.svelte'
  import { deviceOptionsStore, EditWithIcon, Icon, IconSearch, languageStore, resizeObserver } from '..'
  import ui from '../plugin'

  export let items: DropdownIntlItem[]
  export let selected: DropdownIntlItem['id'] | undefined = undefined
  export let params: Record<string, any> = {}
  export let withSearch: boolean = false
  export let searchPlaceholder: IntlString = ui.string.Search

  const dispatch = createEventDispatcher()
  let btns: HTMLButtonElement[] = []

  const keyDown = (ev: KeyboardEvent, n?: number): void => {
    if (ev.key === 'ArrowDown') {
      ev.stopPropagation()
      ev.preventDefault()
      if (n === undefined || n === btns.length - 1) btns[0].focus()
      else btns[n + 1].focus()
    } else if (ev.key === 'ArrowUp') {
      ev.stopPropagation()
      ev.preventDefault()
      if (n === undefined || n === 0) btns[btns.length - 1].focus()
      else btns[n - 1].focus()
    }
  }

  let search: string = ''
  $: lowerSearch = search.toLowerCase()

  async function fillSearchMap (items: DropdownIntlItem[], lang: string): Promise<void> {
    const result: Record<IntlString, string> = {}
    for (const item of items) {
      result[item.label] = (await translate(item.label, item.params, lang)).toLowerCase()
    }
    searchMap = result
  }

  let searchMap: Record<IntlString, string> = {}
  $: if (withSearch) {
    void fillSearchMap(items, $languageStore)
  } else {
    searchMap = {}
  }

  $: filteredItems = withSearch ? items.filter((item) => searchMap[item.label]?.includes(lowerSearch)) : items
  $: btns = btns.slice(0, filteredItems.length)
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')} on:keydown={keyDown}>
  {#if withSearch}
    <div class="search">
      <EditWithIcon
        icon={IconSearch}
        size={'large'}
        width={'100%'}
        autoFocus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        on:change={() => dispatch('search', search)}
        on:input={() => dispatch('search', search)}
        placeholder={searchPlaceholder}
      />
    </div>
    <div class="menu-separator" />
  {:else}
    <div class="menu-space" />
  {/if}
  <div class="scroll">
    <div class="box">
      {#each filteredItems as item, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item flex-between"
          bind:this={btns[i]}
          on:mouseover={(ev) => {
            ev.currentTarget.focus()
          }}
          on:keydown={(ev) => {
            keyDown(ev, i)
          }}
          on:click={() => {
            dispatch('close', item.id)
          }}
        >
          <div class="flex-grow caption-color nowrap flex-presenter flex-gap-2">
            {#if item.icon}
              <Icon size="small" icon={item.icon} iconProps={item.iconProps} />
            {/if}
            <Label label={item.label} params={item.params ?? params} />
          </div>
          <div class="check">
            {#if item.id === selected}<IconCheck size={'small'} />{/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .search {
    display: flex;
    padding: 0.5rem 0.5rem 0 0.5rem;
  }
</style>
