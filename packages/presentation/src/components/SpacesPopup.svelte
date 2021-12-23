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
  import { afterUpdate, createEventDispatcher } from 'svelte'

  import { Label, EditWithIcon, IconSearch } from '@anticrm/ui'
  import SpaceInfo from './SpaceInfo.svelte'

  import type { Ref, Class, Space } from '@anticrm/core'
  import { createQuery } from '../utils'
  import presentation from '..'

  export let _class: Ref<Class<Space>>

  let search: string = ''
  let objects: Space[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(_class, {}, result => { objects = result })
  afterUpdate(() => { dispatch('update', Date.now()) })
</script>

<div class="popup">
  <div class="flex-col">
    <EditWithIcon icon={IconSearch} bind:value={search} placeholder={'Search...'} />
    <div class="label"><Label label={presentation.string.Suggested} /></div>
  </div>
  <div class="flex-grow scroll">
    <div class="flex-col h-full box">
      {#each objects as space}
        <button class="menu-item" on:click={() => { dispatch('close', space) }}>
          <SpaceInfo size={'large'} value={space} />
        </button>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: .5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, .2);
    user-select: none;
  }

  .label {
    margin: 1rem 0 .625rem .375rem;
    font-size: .75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-content-dark-color);
  }

  .scroll {
    overflow-y: scroll;
    .box { padding-right: 1px; }
  }

  .menu-item {
    justify-content: start;
    padding: .5rem;
    color: var(--theme-content-color);
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
</style>
