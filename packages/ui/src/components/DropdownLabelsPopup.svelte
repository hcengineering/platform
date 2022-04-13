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
  import { createEventDispatcher } from 'svelte'
  import CheckBox from './CheckBox.svelte'
  import type { DropdownTextItem } from '../types'
  import plugin from '../plugin'

  export let placeholder: IntlString = plugin.string.SearchDots
  export let items: DropdownTextItem[]
  export let selected: DropdownTextItem['id'] | undefined = undefined

  let search: string = ''
  let phTraslate: string = ''
  $: translate(placeholder, {}).then(res => { phTraslate = res })
  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup">
  <div class="header">
    <input type='text' bind:value={search} placeholder={phTraslate} on:input={(ev) => { }} on:change/>
  </div>
  <div class="scroll">
    <div class="box">
      {#each items.filter((x) => x.label.toLowerCase().includes(search.toLowerCase())) as item}
        <button class="menu-item flex-between" on:click={() => { dispatch('close', item.id) }}>
          <div class="flex-grow caption-color lines-limit-2">{item.label}</div>
          {#if item.id === selected}
            <div class="check"><CheckBox checked primary /></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
