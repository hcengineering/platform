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
  import type { Asset, IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'

  import type { AnySvelteComponent, ListItem } from '../types'
  import plugin from '../plugin'
  import Icon from './Icon.svelte'

  export let icon: Asset | AnySvelteComponent
  export let placeholder: IntlString = plugin.string.SearchDots
  export let items: ListItem[]

  let search: string = ''
  let phTraslate: string = ''
  $: if (placeholder) translate(placeholder, {}).then(res => { phTraslate = res })
  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup">
  <div class="header">
    <input type='text' bind:value={search} placeholder={phTraslate} on:input={(ev) => { }} on:change/>
  </div>
  <div class="scroll">
    <div class="box">
      {#each items.filter((x) => x.label.toLowerCase().includes(search.toLowerCase())) as item}
        <button class="menu-item flex-between" on:click={() => { dispatch('close', item) }}>
          <div class="flex-center img" class:image={item.image}>
            {#if item.image}
              <img src={item.image} alt={item.label} />
            {:else}
              {#if typeof (icon) === 'string'}
                <Icon {icon} size={'small'} />
              {:else}
                <svelte:component this={icon} size={'small'} />
              {/if}
            {/if}
          </div>
          <div class="flex-grow caption-color">{item.label}</div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .img {
    margin-right: .75rem;
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    color: var(--caption-color);
    background-color: var(--popup-bg-hover);
    border-radius: 50%;
    outline: none;
    overflow: hidden;
  }
  .image {
    border-color: transparent;
    img { max-width: fit-content; }
  }
</style>
