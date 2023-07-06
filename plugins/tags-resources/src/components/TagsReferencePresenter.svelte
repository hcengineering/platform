<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import type { TagReference } from '@hcengineering/tags'
  import plugin from '../plugin'
  import { getPlatformColorDef, themeStore, Label } from '@hcengineering/ui'

  export let items: TagReference[]
  export let kind: 'list' | 'link' = 'list'

  $: colors = items.slice(0, 3).map((it) => {
    return getPlatformColorDef(it.color ?? 0, $themeStore.dark)
  })
</script>

{#if items}
  {#if kind === 'link'}
    <button class="link-container">
      {#each colors as color}
        <div class="color" style:background-color={color.color} />
      {/each}
      <span class="label overflow-label ml-1 text-sm caption-color max-w-40">
        <Label label={plugin.string.NumberLabels} params={{ count: items.length }} />
      </span>
    </button>
  {:else if kind === 'list'}
    <div class="listitems-container">
      {#each colors as color}
        <div class="color" style:background-color={color.color} />
      {/each}
      <span class="label overflow-label ml-1-5 max-w-40">
        <Label label={plugin.string.NumberLabels} params={{ count: items.length }} />
      </span>
    </div>
  {/if}
{/if}

<style lang="scss">
  .listitems-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-left: 0.5rem;
    height: 1.75rem;
    min-width: 0;
    min-height: 0;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 1.5rem;
    user-select: none;

    &:hover {
      background-color: var(--theme-button-hovered);
    }
    .label {
      color: var(--theme-caption-color);
    }
  }

  .link-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.375rem;
    height: 1.5rem;
    min-width: 1.5rem;
    font-size: 0.75rem;
    line-height: 0.75rem;
    white-space: nowrap;
    color: var(--theme-content-color);
    background-color: var(--theme-link-button-color);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    transition-property: border, background-color, color, box-shadow;
    transition-duration: 0.15s;

    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-link-button-hover);
      border-color: var(--theme-list-divider-color);
      transition-duration: 0;
    }
    &:focus {
      border-color: var(--primary-edit-border-color) !important;
    }
    &:disabled {
      color: rgb(var(--theme-caption-color) / 40%);
      cursor: not-allowed;
    }
  }

  .color {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;

    &:not(:nth-child(3)) {
      mask: radial-gradient(circle at 100% 50%, rgba(0, 0, 0, 0) 48.5%, rgb(0, 0, 0) 50%);
    }
    &:not(:first-child) {
      margin-left: calc(1px - 0.25rem);
    }
  }
</style>
