<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { Action } from '@anticrm/ui'
  import { ActionIcon, Icon, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let notifications = 0
  export let actions: Action[] = []
  export let selected: boolean = false

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="flex-row-center container" class:selected={selected}
  on:click|stopPropagation={() => {
    dispatch('click')
  }}
>
  <div class="icon">
    {#if icon}
      <Icon {icon} size={'small'} />
    {/if}
  </div>
  <span>
    {#if label}<Label {label} />{:else}{label}{/if}
  </span>
  {#each actions as action}
    <div class="tool">
      <ActionIcon label={action.label} icon={action.icon} size={'small'} action={action.action} />
    </div>
  {/each}
  {#if notifications > 0}
    <div class="counter">{notifications}</div>
  {/if}
</div>

<style lang="scss">
  .container {
    margin: 0 16px;
    padding-left: 10px;
    padding-right: 12px;
    min-height: 36px;
    font-weight: 500;
    color: var(--theme-caption-color);
    border-radius: 8px;
    user-select: none;
    cursor: pointer;

    .icon {
      margin-right: 18px;
      width: 16px;
      min-width: 16px;
      height: 16px;
      border-radius: 4px;
      opacity: 0.3;
    }
    span {
      flex-grow: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .tool {
      margin-left: 12px;
      visibility: hidden;
    }
    .counter {
      margin-left: 12px;
      font-weight: 600;
      font-size: 12px;
      line-height: 100%;
    }

    &.selected {
      background-color: var(--theme-button-bg-enabled);
    }

    &:hover {
      background-color: var(--theme-button-bg-enabled);
      .tool {
        visibility: visible;
      }
    }
  }
</style>
