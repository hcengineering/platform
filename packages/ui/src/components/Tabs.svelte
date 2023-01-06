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
  import type { TabModel } from '../types'
  import Label from './Label.svelte'
  import Component from './Component.svelte'

  export let model: TabModel
  export let selected = 0
</script>

<div class="flex-stretch container">
  {#each model as tab, i}
    <div
      class="flex-row-center tab"
      class:selected={i === selected}
      on:click={() => {
        selected = i
      }}
    >
      <Label label={tab.label} />
    </div>
  {/each}
  <div class="grow" />
</div>
{#each model as tab, i}
  {#if selected === i}
    {#if typeof tab.component === 'string'}
      <Component is={tab.component} props={tab.props} />
    {:else}
      <svelte:component this={tab.component} {...tab.props} />
    {/if}
  {/if}
{/each}

<style lang="scss">
  .container {
    flex-shrink: 0;
    flex-wrap: nowrap;
    margin-bottom: 0.5rem;
    width: 100%;
    height: 4.5rem;
    border-bottom: 1px solid var(--theme-menu-divider);

    .tab {
      height: 4.5rem;
      color: var(--theme-content-trans-color);
      cursor: pointer;
      user-select: none;

      &.selected {
        border-top: 0.125rem solid transparent;
        border-bottom: 0.125rem solid var(--theme-caption-color);
        color: var(--theme-caption-color);
        cursor: default;
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
