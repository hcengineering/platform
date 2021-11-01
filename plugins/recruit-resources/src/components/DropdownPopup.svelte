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
  import type { IntlString, Asset } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'

  import { Label, EditWithIcon, IconSearch, Icon } from '@anticrm/ui'
  import type { AnySvelteComponent } from '@anticrm/ui'
  // import UserInfo from './UserInfo.svelte'

  interface ListItem {
    icon: Asset | AnySvelteComponent | undefined
    label: string
    description: string | undefined
  }

  export let title: IntlString
  export let caption: IntlString
  export let items: ListItem[]
  export let header: boolean = true

  let search: string = ''

  const dispatch = createEventDispatcher()
</script>

<div class="popup">
  <div class="card-bg" />
  <div class="title"><Label label={title} /></div>
  {#if header}
    <div class="flex-col header">
      <EditWithIcon icon={IconSearch} bind:value={search} placeholder={'Search...'} />
      <div class="caption"><Label label={caption} /></div>
    </div>
  {/if}
  <div class="scroll">
    <div class="flex-col box">
      {#each items as item}
        <button class="flex-row-center menu-item" on:click={() => { dispatch('close', item) }}>
          <div class="flex-center icon">
            {#if typeof (item.icon) === 'string'}
              <Icon icon={item.icon} size={'small'} />
            {:else}
              <svelte:component this={item.icon} size={'small'} />
            {/if}
          </div>
          <div class="flex-grow flex-col">
            <div class="caption-color">{item.label}</div>
            <div class="fs-subtitle caption-dark-color">{item.description}</div>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: .75rem;
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
    // justify-content: start;
    text-align: left;

    padding: .5rem;
    border-radius: .5rem;

    .icon {
      margin-right: .75rem;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-caption-color);
      background-color: var(--theme-button-bg-hovered);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: .5rem;
    }

    &:hover { background-color: var(--theme-button-bg-focused); }
    &:focus {
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      z-index: 1;
    }
  }

  .card-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: .75rem;
      backdrop-filter: blur(24px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
</style>
