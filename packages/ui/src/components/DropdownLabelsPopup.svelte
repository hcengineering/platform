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
  import { createEventDispatcher } from 'svelte'

  import Label from './Label.svelte'
  import EditWithIcon from './EditWithIcon.svelte'
  import IconSearch from './icons/Search.svelte'
  import IconBlueCheck from './icons/BlueCheck.svelte'
  import type { DropdownTextItem } from '../types'
  import plugin from '../plugin'

  export let title: IntlString | undefined = undefined
  export let caption: IntlString = plugin.string.Suggested
  export let items: DropdownTextItem[]
  export let selected: DropdownTextItem['id'] | undefined = undefined
  export let header: boolean = false

  let search: string = ''
  const dispatch = createEventDispatcher()
</script>

<div
  class="antiPopup"
  class:antiPopup-withHeader={header}
  class:antiPopup-withTitle={title}
>
  {#if header}
    {#if title}
      <div class="ap-title"><Label label={title} /></div>
    {:else}
      <div class="ap-space" />
    {/if}
    <div class="ap-header">
      <EditWithIcon icon={IconSearch} bind:value={search} placeholder={plugin.string.SearchDots} focus />
      <div class="ap-caption"><Label label={caption} /></div>
    </div>
  {/if}
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#each items.filter((x) => x.label.toLowerCase().includes(search.toLowerCase())) as item}
        <button class="ap-menuItem flex-row-center h-9" on:click={() => { dispatch('close', item.id) }}>
          <div class="flex-grow caption-color">{item.label}</div>
          {#if item.id === selected}
            <div class="ap-check"><IconBlueCheck size={'small'} /></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
