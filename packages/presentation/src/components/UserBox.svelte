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

  import { PopupMenu, Label, EditWithIcon, IconSearch } from '@anticrm/ui'
  import Avatar from './Avatar.svelte'
  import UserInfo from './UserInfo.svelte'
  import Add from './icons/Add.svelte'
  import Close from './icons/Close.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import type { Person } from '@anticrm/contact'
  import { createQuery } from '../utils'

  export let _class: Ref<Class<Person>>
  export let title: IntlString
  export let caption: IntlString
  export let value: Ref<Person>
  export let show: boolean = false

  let search: string = ''
  let selected: Person | undefined

  let objects: Person[] = []

  const query = createQuery()
  $: query.query(_class, {}, result => { objects = result })
</script>

<div class="flex-row-center">
  <PopupMenu bind:show={show}>
    <button
      slot="trigger"
      class="focused-button btn"
      class:selected={show}
      on:click|preventDefault={() => {
        show = !show
      }}
    >
      {#if selected}
        <Avatar size={34} />
      {:else}
        <div class="icon">
          {#if show}<Close size={'small'} />{:else}<Add size={'small'} />{/if}
        </div>
      {/if}
    </button>

    <div class="header">
      <div class="title"><Label label={title} /></div>
      <EditWithIcon icon={IconSearch} bind:value={search} placeholder={'Search...'} />
      <div class="caption"><Label label={caption} /></div>
    </div>

    {#each objects as person}
      <button class="menu-item" on:click={() => {
        selected = person
        value = person._id
        show = !show
      }}><UserInfo value={person}/></button>
    {/each}
  </PopupMenu>

  <div class="selectUser">
    <div class="title"><Label label={title} /></div>
    <div class="caption-color">
      {#if selected}{selected.firstName + ' ' + selected.lastName}{:else}<Label label={'Not selected'} />{/if}
    </div>
  </div>
</div>

<style lang="scss">
  .btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
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

  .selectUser {
    margin-left: .75rem;
    .title {
      font-size: .75rem;
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
  }
</style>
