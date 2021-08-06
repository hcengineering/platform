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

  import { PopupMenu, Label } from '@anticrm/ui'
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

<div class="userBox">
  <PopupMenu bind:show={show}>
    <button
      slot="trigger"
      class="btn"
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
      <input class="searchBox" type="text" bind:value={search} placeholder="Search..." />
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
    <div class="user">
      {#if selected}{selected.firstName + ' ' + selected.lastName}{:else}<Label label={'Not selected'} />{/if}
    </div>
  </div>
</div>

<style lang="scss">
  .userBox {
    display: flex;
    flex-wrap: nowrap;

    .btn {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 0;
      width: 36px;
      height: 36px;
      background-color: var(--theme-button-bg-focused);
      border: 1px solid transparent;
      border-radius: 50%;
      outline: none;
      cursor: pointer;

      .icon {
        width: 16px;
        height: 16px;
        opacity: 0.3;
      }

      &.selected {
        background-color: var(--theme-button-bg-focused);
        border: 1px solid var(--theme-bg-accent-color);
      }

      &:hover {
        background-color: var(--theme-button-bg-pressed);
        border: 1px solid var(--theme-bg-accent-color);
        .icon {
          opacity: 1;
        }
      }
      &:focus {
        border: 1px solid var(--primary-button-focused-border);
        box-shadow: 0 0 0 3px var(--primary-button-outline);
        .icon {
          opacity: 1;
        }
      }
    }

    .header {
      text-align: left;
      .title {
        margin-bottom: 16px;
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-caption-color);
      }
      .searchBox {
        position: relative;
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 12px 16px;
        min-width: 220px;
        height: 40px;
        font-family: inherit;
        font-size: 14px;
        line-height: 17px;
        color: var(--theme-caption-color);
        background-color: var(--theme-bg-accent-color);
        border: 1px solid var(--theme-bg-accent-hover);
        border-radius: 12px;
        outline: none;

        &::placeholder {
          color: var(--theme-content-trans-color);
        }
        &:focus {
          background-color: var(--theme-bg-focused-color);
          border-color: var(--theme-bg-focused-border);
        }
      }
      .caption {
        margin: 16px 0 10px 6px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--theme-content-dark-color);
      }
    }

    .menu-item {
      margin: 0;
      padding: 6px;
      font-family: inherit;
      background-color: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      outline: none;
      cursor: pointer;

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
      margin-left: 12px;
      .title {
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-content-accent-color);
      }
      .user {
        font-size: 14px;
        color: var(--theme-caption-color);
      }
    }
  }
</style>
