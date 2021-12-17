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
  import { afterUpdate, createEventDispatcher } from 'svelte'

  import { Label, EditWithIcon, IconSearch } from '@anticrm/ui'
  import UserInfo from './UserInfo.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import type { Person } from '@anticrm/contact'
  import { createQuery } from '../utils'
  import presentation from '..'
  import { ActionIcon } from '@anticrm/ui'
  import BlueCheck from './icons/BlueCheck.svelte'

  export let _class: Ref<Class<Person>>
  export let title: IntlString
  export let caption: IntlString
  export let selected: Ref<Person> | undefined

  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined

  let search: string = ''
  let objects: Person[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(_class, { name: { $like: '%' + search + '%' } }, result => { objects = result })
  afterUpdate(() => { dispatch('update', Date.now()) })
</script>

<div class="popup">
  <div class="header">
    <div class="title"><Label label={title} /></div>
    <EditWithIcon icon={IconSearch} bind:value={search} placeholder={'Search...'} />
    <div class="caption"><Label label={caption} /></div>
  </div>
  <div class="scroll">
    <div class="flex-col box">
      {#each objects as person}
        <button class="menu-item" on:click={() => { dispatch('close', person) }}>
          <div class='flex-grow'>
            <UserInfo size={'medium'} value={person} />
          </div>
          {#if allowDeselect && person._id === selected}
            <ActionIcon direction={'top'} label={titleDeselect ?? presentation.string.Deselect} icon={BlueCheck} action={() => { dispatch('close', null) }} size={'small'}/>
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
    padding: 1rem;
    max-height: 100%;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    user-select: none;
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, .35));
  }

  .header {
    text-align: left;
    .title {
      margin-bottom: 1rem;
      font-weight: 500;
      color: var(--theme-caption-color);
    }
    .caption {
      margin: 1rem 0 .625rem .375rem;
      font-size: .75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--theme-content-dark-color);
    }
  }

  .scroll {
    flex-grow: 1;
    overflow-x: hidden;
    overflow-y: auto;
    .box {
      margin-right: 1px;
      height: 100%;
    }
  }

  .menu-item {
    justify-content: start;
    padding: .375rem;
    border-radius: .5rem;

    &:hover {
      background-color: var(--theme-button-bg-pressed);
      border: 1px solid var(--theme-bg-accent-color);
    }
    &:focus {
      border: 1px solid var(--primary-button-focused-border);
      box-shadow: 0 0 0 3px var(--primary-button-outline);
      z-index: 1;
    }
  }
</style>
