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
  import type { Asset,IntlString } from '@anticrm/platform'  
  import { createEventDispatcher } from 'svelte'
  import { AnySvelteComponent } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  
  export let actions: {
    label: IntlString
    icon?: Asset | AnySvelteComponent
    action: (ctx?: any) => void | Promise<void>
  }[] = []
  export let ctx: any = undefined

  const dispatch = createEventDispatcher()  
</script>

<div class="flex-col popup">
  {#each actions as action}
    <div class="flex-row-center menu-item" on:click={() => { 
      dispatch('close')
      action.action(ctx) 
    }}>
      {#if action.icon}
        <div class="scale-75">
          <Icon icon={action.icon} size={'medium'} />
        </div>
      {/if}
      <div class="ml-3"><Label label={action.label} /></div>
    </div>
  {/each}
</div>

<style lang="scss">
  .popup {
    padding: .5rem;
    height: 100%;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0 .75rem 1.25rem rgba(0, 0, 0, .2);
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: .375rem 1rem .375rem .5rem;
    color: var(--theme-content-color);
    border-radius: .5rem;
    cursor: pointer;

    &:hover {
      background-color: var(--theme-button-bg-hovered);
      color: var(--theme-caption-color);
    }
  }
</style>
