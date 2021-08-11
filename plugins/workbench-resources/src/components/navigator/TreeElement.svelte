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

  import type { Asset, IntlString } from '@anticrm/status'
  import type { Action } from '@anticrm/ui'
  import { Icon, Label, ActionIcon } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let node = false
  export let collapsed = false
  export let actions: Action[] = []

  const dispatch = createEventDispatcher()
</script>

<div class="flex items-center mx-5 h-10 rounded-lg select-none cursor-pointer tree-element"
  on:click|stopPropagation={() => {
    if (node && !icon) collapsed = !collapsed
    dispatch('click')
  }}
>
  <div
    class="opacity-30 {node ? 'ml-3 mr-5' : 'ml-12 mr-2'}"
    style="min-width: 1.143em;"
  >
    {#if icon}
      <Icon {icon} size={'small'}/>
    {:else}
      {#if collapsed}<Collapsed size={'small'} />{:else}<Expanded size={'small'} />{/if}
    {/if}
  </div>
  <span class="flex-grow mr-3 whitespace-nowrap overflow-ellipsis overflow-hidden select-none {node ? 'font-medium caption-color' : 'content-color'}">
    {#if label}<Label {label}/>{:else}{title}{/if}
  </span>
  {#each actions as action}
    <div class="mr-3 invisible tool">
      <ActionIcon label={action.label} icon={action.icon} size={'small'} action={action.action} />
    </div>
  {/each}
  {#if notifications > 0 && collapsed}
    <div class="mr-3 font-semibold text-sm caption-color">{notifications}</div>
  {/if}
</div>
{#if node && !icon}
  <div class={collapsed ? 'invisible h-0 mb-2' : 'visible h-auto mb-6'}>
    <slot/>
  </div>
{/if}

<style lang="scss">
  .tree-element:hover {
    background-color: var(--theme-button-bg-enabled);
    .tool {
      visibility: visible;
    }
  }
</style>