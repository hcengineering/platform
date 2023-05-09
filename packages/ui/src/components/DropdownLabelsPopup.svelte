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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import { deviceOptionsStore, resizeObserver } from '..'
  import plugin from '../plugin'
  import type { DropdownTextItem } from '../types'
  import IconCheck from './icons/Check.svelte'
  import ListView from './ListView.svelte'
  import Icon from './Icon.svelte'

  export let placeholder: IntlString = plugin.string.SearchDots
  export let items: DropdownTextItem[]
  export let selected: DropdownTextItem['id'] | DropdownTextItem['id'][] | undefined = undefined
  export let multiselect: boolean = false

  let search: string = ''
  let phTraslate: string = ''
  $: translate(placeholder, {}).then((res) => {
    phTraslate = res
  })
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
    if (multiselect && Array.isArray(selected)) {
      const index = selected.indexOf(item.id)
      if (index !== -1) {
        selected.splice(index, 1)
        selected = selected
      } else {
        selected = selected === undefined ? [item.id] : [...selected, item.id]
      }
      dispatch('update', selected)
    } else {
      dispatch('close', item.id)
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

  function isSelected (
    selected: DropdownTextItem['id'] | DropdownTextItem['id'][] | undefined,
    item: DropdownTextItem
  ): boolean {
    if (Array.isArray(selected)) {
      return selected.includes(item.id)
    } else {
      return item.id === selected
    }
  }
</script>

<div
  class="selectPopup"
  on:keydown={onKeydown}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
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
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={objects.length} bind:selection>
        <svelte:fragment slot="item" let:item={idx}>
          {@const item = objects[idx]}

          <button
            class="menu-item flex-between w-full"
            on:click={() => {
              if (multiselect && Array.isArray(selected)) {
                const index = selected.indexOf(item.id)
                if (index !== -1) {
                  selected.splice(index, 1)
                  selected = selected
                } else {
                  selected = selected === undefined ? [item.id] : [...selected, item.id]
                }
                dispatch('update', selected)
              } else {
                dispatch('close', item.id)
              }
            }}
          >
            <div class="check">
              {#if isSelected(selected, item)}
                <Icon icon={IconCheck} size={'small'} />
              {/if}
            </div>
            <div class="labels overflow-label">{item.label}</div>
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
</div>
