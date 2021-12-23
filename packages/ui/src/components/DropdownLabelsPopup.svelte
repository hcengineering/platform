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

  export let title: IntlString
  export let caption: IntlString | undefined = undefined
  export let items: DropdownTextItem[]
  export let selected: DropdownTextItem['id'] | undefined = undefined
  export let header: boolean = false

  let search: string = ''

  const dispatch = createEventDispatcher()
</script>

<div class="popup">
  {#if header}
    {#if title}<div class="title"><Label label={title} /></div>{/if}
    <div class="flex-col header">
      <EditWithIcon icon={IconSearch} bind:value={search} placeholder={'Search...'} />
      {#if caption}<div class="caption"><Label label={caption} /></div>{/if}
    </div>
  {/if}
  <div class="scroll">
    <div class="flex-col box">
      {#each items.filter((x) => x.label.toLowerCase().includes(search.toLowerCase())) as item}
        <button class="flex-between menu-item" on:click={() => { dispatch('close', item.id) }}>
          <div class="flex-grow caption-color">{item.label}</div>
          {#if item.id === selected}
            <div class="check"><IconBlueCheck size={'small'} /></div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    min-width: 15rem;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, .2);
  }

  .title {
    margin: 1rem 1rem .25rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }
  .header {
    margin: .25rem 1rem 0;
    text-align: left;
    .caption {
      margin-top: .5rem;
      font-size: .75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--theme-content-trans-color);
    }
  }

  .scroll {
    flex-grow: 1;
    padding: .5rem;
    overflow-x: hidden;
    overflow-y: auto;
    .box {
      margin-right: 1px;
      height: 100%;
    }
  }

  .menu-item {
    text-align: left;
    padding: .5rem;
    border-radius: .5rem;

    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-button-bg-hovered);
    }
    &:focus {
      color: var(--theme-content-accent-color);
      background-color: var(--theme-button-bg-pressed);
      z-index: 1;
    }
  }

  .check {
    margin-left: 1rem;
    width: 1rem;
    height: 1rem;
  }
</style>
