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
  import { getPlatformColor } from '../colors'
  import ListView from './ListView.svelte'

  export let placeholder: IntlString | undefined = undefined
  export let placeholderParam: any | undefined = undefined
  export let searchable: boolean = false
  export let value: Array<{ id: number | string; color: number; label: string }>

  let search: string = ''

  let phTraslate: string = ''
  $: if (placeholder) {
    translate(placeholder, placeholderParam ?? {}).then((res) => {
      phTraslate = res
    })
  }

  const dispatch = createEventDispatcher()

  $: objects = value.filter((el) => el.label.toLowerCase().includes(search.toLowerCase()))

  let selection = 0
  let list: ListView

  async function handleSelection (_: Event | undefined, selection: number): Promise<void> {
    const space = objects[selection]
    dispatch('close', space)
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
  let input: HTMLElement
  onMount(() => {
    if (input && !$deviceOptionsStore.isMobile) input.focus()
  })
</script>

<div
  class="selectPopup"
  on:keydown={onKeydown}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  {#if searchable}
    <div class="header">
      <input bind:this={input} type="text" bind:value={search} placeholder={phTraslate} on:input={() => {}} on:change />
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      <ListView
        bind:this={list}
        count={objects.length}
        bind:selection
        on:click={(evt) => handleSelection(evt, evt.detail)}
      >
        <svelte:fragment slot="item" let:item>
          {@const itemValue = objects[item]}
          <button
            class="menu-item w-full"
            on:click={() => {
              dispatch('close', itemValue)
            }}
          >
            <div class="color" style="background-color: {getPlatformColor(itemValue.color)}" />
            <span class="label">{itemValue.label}</span>
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
</div>
