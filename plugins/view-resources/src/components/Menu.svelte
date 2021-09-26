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
  import type { AnySvelteComponent } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { Icon, Label, IconMoreH, IconFile } from '@anticrm/ui'

  export let title: IntlString
  export let caption: IntlString

  interface PopupItem {
    icon: Asset | AnySvelteComponent
    label: IntlString
    action?: () => Promise<void>
  }

  const dispatch = createEventDispatcher()
  const actions: Array<PopupItem> = [{ icon: IconFile, label: 'Application', action: async () => {} },
                                     { icon: IconMoreH, label: 'Options', action: async () => {} }]
</script>

<div class="flex-col popup">
  {#each actions as action}
    <div class="flex-row-center menu-item" on:click={() => { dispatch('close') }}>
      <div class="icon">
        {#if typeof (action.icon) === 'string'}
          <Icon icon={action.icon} size={'large'} />
        {:else}
          <svelte:component this={action.icon} size={'large'} />
        {/if}
      </div>
      <div class="label"><Label label={action.label} /></div>
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
    border-radius: .5rem;
    cursor: pointer;

    .icon {
      margin-right: .75rem;
      transform-origin: center center;
      transform: scale(.75);
      opacity: .3;
    }
    .label {
      flex-grow: 1;
      color: var(--theme-content-accent-color);
    }
    &:hover { background-color: var(--theme-button-bg-hovered); }
  }
</style>
