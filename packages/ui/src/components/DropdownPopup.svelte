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
  import { createEventDispatcher } from 'svelte'

  import Label from './Label.svelte'
  import EditWithIcon from './EditWithIcon.svelte'
  import IconSearch from './icons/Search.svelte'
  import type { AnySvelteComponent, ListItem } from '../types'
  import plugin from '../plugin'
  import Icon from './Icon.svelte'

  export let title: IntlString | undefined = undefined
  export let icon: Asset | AnySvelteComponent
  export let caption: IntlString = plugin.string.Suggested
  export let items: ListItem[]
  export let header: boolean = true

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
        <button class="ap-menuItem" on:click={() => { dispatch('close', item) }}>
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
  <div class="ap-space" />
</div>

<style lang="scss">
  .img {
    margin-right: .75rem;
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--theme-caption-color);
    background-color: transparent;
    border: 1px solid var(--theme-card-divider);
    border-radius: .5rem;
    outline: none;
    overflow: hidden;
  }
  .image {
    border-color: transparent;
    img { max-width: fit-content; }
  }
</style>
