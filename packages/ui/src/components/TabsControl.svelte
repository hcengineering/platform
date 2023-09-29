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
  import { Icon, TabBase } from '..'
  import Label from './Label.svelte'

  export let model: TabBase[]
  export let selected = 0
  export let padding: string | undefined = undefined
  export let noMargin: boolean = false
  export let size: 'small' | 'medium' = 'medium'
</script>

<div class="flex-stretch tabs-container" class:small={size === 'small'} style:padding class:noMargin>
  {#each model as tab, i}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="flex-row-center tab"
      class:selected={i === selected}
      on:click={() => {
        selected = i
      }}
    >
      {#if tab.icon !== undefined}
        <div class="mr-2" class:ml-2={tab.label === ''}>
          <Icon icon={tab.icon} size={'small'} />
        </div>
      {/if}
      {#if tab.label !== ''}
        <Label label={tab.label} />
      {/if}
    </div>
  {/each}
  <div class="grow" />
  <slot name="rightButtons" />
</div>

<slot name="content" {selected} />

<style lang="scss">
  .tabs-container {
    flex-shrink: 0;
    flex-wrap: nowrap;
    width: 100%;
    height: 4.5rem;
    align-items: center;
    border-bottom: 1px solid var(--theme-divider-color);

    &:not(.noMargin) {
      margin-bottom: 0.5rem;
    }
    &.small {
      height: 3.25rem;

      .tab {
        height: 3.25rem;
      }
    }

    .tab {
      height: 4.5rem;
      color: var(--theme-dark-color);
      cursor: pointer;
      user-select: none;

      &.selected {
        border-top: 0.125rem solid transparent;
        border-bottom: 0.125rem solid var(--theme-tablist-plain-color);
        color: var(--theme-caption-color);
        cursor: default;
      }
      &:not(.selected):hover {
        color: var(--theme-content-color);
      }
    }
    .tab + .tab {
      margin-left: 2.5rem;
    }
    .grow {
      min-width: 2.5rem;
      flex-grow: 1;
    }
  }
</style>
