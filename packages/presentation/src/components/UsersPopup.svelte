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
  import { ActionIcon, IconBlueCheck } from '@anticrm/ui'

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
  <div class="title"><Label label={title} /></div>
  <div class="flex-col header">
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
            <ActionIcon direction={'top'} label={titleDeselect ?? presentation.string.Deselect} icon={IconBlueCheck} action={() => { dispatch('close', null) }} size={'small'}/>
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
    justify-content: start;
    padding: .375rem;
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
