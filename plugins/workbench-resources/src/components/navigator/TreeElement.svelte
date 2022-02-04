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
  import Collapsed from '../icons/Collapsed.svelte'
  import Expanded from '../icons/Expanded.svelte'

  import type { Asset, IntlString } from '@anticrm/platform'
  import type { Action } from '@anticrm/ui'
  import type { Ref, Space } from '@anticrm/core'
  import { Icon, Label, ActionIcon, Menu, showPopup, IconMoreV } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Space> | undefined = undefined
  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let node = false
  export let collapsed = false
  export let selected = false
  export let actions: () => Promise<Action[]> = async () => []

  const dispatch = createEventDispatcher()

  let hovered = false
  async function onMenuClick (ev: MouseEvent) {
    showPopup(Menu, { actions: await actions(), ctx: _id }, ev.target as HTMLElement, () => {
      hovered = false
    })
    hovered = true
  }
</script>

<div
  class="container"
  class:selected
  class:hovered
  on:click|stopPropagation={() => {
    if (node && !icon) collapsed = !collapsed
    dispatch('click')
  }}
>
  <div class="icon" class:sub={!node}>
    {#if icon}
      <Icon {icon} size={'small'} />
    {:else if collapsed}<Collapsed size={'small'} />{:else}<Expanded size={'small'} />{/if}
  </div>
  <span class="label" class:sub={node}>
    {#if label}<Label {label} />{:else}{title}{/if}
  </span>
  {#if node === false}
    <div class="tool" on:click|stopPropagation={onMenuClick}>
      <IconMoreV size={'small'} />
    </div>
  {:else}
    {#await actions() then actionItems}
      {#if actionItems.length === 1}
        <div class="tool">
          <ActionIcon
            label={actionItems[0].label}
            icon={actionItems[0].icon}
            size={'small'}
            action={(ev) => {
              actionItems[0].action(_id, ev)
            }}
          />
        </div>
      {:else if actionItems.length > 1}
        <div class="tool" on:click|stopPropagation={onMenuClick}>
          <IconMoreV size={'small'} />
        </div>
      {/if}
    {/await}
  {/if}
  {#if notifications > 0 && collapsed}
    <div class="counter">{notifications}</div>
  {/if}
</div>
{#if node && !icon && !collapsed}
  <div class="dropbox"><slot /></div>
{/if}

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    margin: 0 1rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    user-select: none;
    cursor: pointer;

    .icon {
      min-width: 1rem;
      color: var(--theme-content-trans-color);
      margin: 0 1.125rem 0 0.625rem;
      &.sub {
        margin: 0 0.5rem 0 2.75rem;
      }
    }
    .label {
      flex-grow: 1;
      margin-right: 0.75rem;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      user-select: none;
      font-weight: 400;
      color: var(--theme-content-color);
      &.sub {
        font-weight: 500;
        color: var(--theme-caption-color);
      }
    }
    .tool {
      margin-right: 0.75rem;
      visibility: hidden;
    }
    .counter {
      margin-right: 0.75rem;
      font-weight: 600;
      font-size: 0.75rem;
      color: var(--theme-caption-color);
    }

    &:hover,
    &.hovered {
      background-color: var(--theme-button-bg-enabled);
      .tool {
        visibility: visible;
      }
    }

    &.selected {
      background-color: var(--theme-menu-selection);
      &:hover {
        background-color: var(--theme-button-bg-enabled);
      }
    }
  }

  .dropbox {
    height: auto;
    margin-bottom: 0.5rem;
  }
</style>
