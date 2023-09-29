<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import { deviceOptionsStore, resizeObserver } from '..'
  import plugin from '../plugin'
  import type { AnySvelteComponent, ListItem } from '../types'
  import Icon from './Icon.svelte'
  import ListView from './ListView.svelte'
  import { themeStore } from '@hcengineering/theme'

  export let icon: Asset | AnySvelteComponent
  export let placeholder: IntlString = plugin.string.SearchDots
  export let items: ListItem[]
  export let withSearch: boolean = true

  let search: string = ''
  let phTraslate: string = ''
  $: if (placeholder) {
    translate(placeholder, {}, $themeStore.language).then((res) => {
      phTraslate = res
    })
  }
  const dispatch = createEventDispatcher()
  let searchInput: HTMLInputElement

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })

  let selection = 0
  let list: ListView

  $: objects = items.filter((x) => x.label.toLowerCase().includes(search.toLowerCase()))

  async function handleSelection (evt: Event | undefined, selection: number): Promise<void> {
    const item = objects[selection]

    if (item.isSelectable ?? true) {
      dispatch('close', item)
    }
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, selection)
    }
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')} on:keydown={onKeydown}>
  {#if withSearch}
    <div class="header">
      <input
        bind:this={searchInput}
        type="text"
        bind:value={search}
        placeholder={phTraslate}
        on:input={(ev) => {}}
        on:change
      />
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={objects.length} bind:selection>
        <svelte:fragment slot="item" let:item={idx}>
          {@const item = objects[idx]}

          <button
            class="flex-between menu-item w-full"
            disabled={item.isSelectable === false}
            on:click={(evt) => {
              handleSelection(evt, idx)
            }}
          >
            {#if item.image || item.icon || icon}
              <div class="flex-center img" class:image={item.image}>
                {#if item.image}
                  <img src={item.image} alt={item.label} />
                {:else if item.icon}
                  <Icon icon={item.icon} size={'medium'} iconProps={item.iconProps} />
                {:else if typeof icon === 'string'}
                  <Icon {icon} size={'small'} />
                {:else}
                  <svelte:component this={icon} size={'small'} />
                {/if}
              </div>
            {/if}
            <div class="flex-grow caption-color font-{item.fontWeight} pl-{item.paddingLeft}">{item.label}</div>
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
</div>

<style lang="scss">
  .img {
    margin-right: 0.75rem;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
  }
  .image {
    border-color: transparent;
    color: var(--caption-color);
    background-color: var(--popup-bg-hover);
    border-radius: 50%;
    outline: none;
    overflow: hidden;
    img {
      max-width: fit-content;
    }
  }
</style>
