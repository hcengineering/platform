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
  import { TagElement } from '@hcengineering/tags'
  import { getPlatformColorDef, themeStore } from '@hcengineering/ui'

  export let values: TagElement[]
  export let limit: number = 4
</script>

<div class="container">
  {#each values as value, i}
    {@const valueColor = getPlatformColorDef(value.color ?? 0, $themeStore.dark)}
    {#if i < limit}
      <div class="item" class:last={i === limit - 1} class:first={i === 0}>
        <div class="color" style:background-color={valueColor.color} />
        {#if i === limit - 1 && values.length <= limit}
          <span class="label overflow-label ml-1-5 max-w-40" style:color={valueColor.title}>
            {value.title}
          </span>
        {/if}
      </div>
    {/if}
  {/each}
</div>
{#if values.length > limit}
  <div class="ml-2">
    +{values.length - limit}
  </div>
{/if}

<style lang="scss">
  .container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    background-color: var(--theme-button-default);
    height: 1.5rem;
    border-radius: 1.5rem;
    border: 1px solid var(--theme-button-border);
    user-select: none;

    .item {
      align-items: center;
      border-radius: 1.5rem;
      height: 1.5rem;
      padding: 0.25rem 0.25rem 0.25rem 0.625rem;
      display: flex;
      &.last {
        padding: 0.25rem 0.625rem;
      }
      &:not(.first) {
        border: 1px solid var(--theme-button-border);
        border-right: 1px solid transparent;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
    }

    .label {
      color: var(--theme-caption-color);
    }
  }

  .color {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
</style>
