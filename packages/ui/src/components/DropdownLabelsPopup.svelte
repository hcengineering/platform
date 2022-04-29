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
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import CheckBox from './CheckBox.svelte'
  import type { DropdownTextItem } from '../types'
  import plugin from '../plugin'

  export let placeholder: IntlString = plugin.string.SearchDots
  export let items: DropdownTextItem[]
  export let selected: DropdownTextItem['id'] | undefined = undefined

  let search: string = ''
  let phTraslate: string = ''
  $: translate(placeholder, {}).then((res) => {
    phTraslate = res
  })
  const dispatch = createEventDispatcher()
  const btns: HTMLButtonElement[] = []
  let searchInput: HTMLInputElement

  const keyDown = (ev: KeyboardEvent, n: number): void => {
    if (ev.key === 'ArrowDown') {
      if (n === btns.length - 1) btns[0].focus()
      else btns[n + 1].focus()
    } else if (ev.key === 'ArrowUp') {
      if (n === 0) btns[btns.length - 1].focus()
      else btns[n - 1].focus()
    } else searchInput.focus()
  }

  onMount(() => {
    if (searchInput) searchInput.focus()
  })
</script>

<div class="selectPopup">
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
      {#each items.filter((x) => x.label.toLowerCase().includes(search.toLowerCase())) as item, i}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item flex-between"
          on:mouseover={(ev) => ev.currentTarget.focus()}
          on:keydown={(ev) => keyDown(ev, i)}
          on:click={() => {
            dispatch('close', item.id)
          }}
        >
          <div class="flex-grow caption-color lines-limit-2">{item.label}</div>
          {#if item.id === selected}
            <div class="check-right"><CheckBox checked primary /></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
