<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import type { Ref, Space } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { filterStore, removeFilter } from '../../filter'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'

  export let hiddenStartIndex: number = 0
  export let space: Ref<Space> | undefined = undefined
</script>

<div class="filter-overflow-popover">
  <div class="title"><Label label={view.string.HiddenFilters} /></div>
  <div class="list">
    {#each $filterStore as filter, i (filter.index)}
      {#if i >= hiddenStartIndex}
        <div class="row">
          <FilterSection
            {filter}
            {space}
            on:remove={() => removeFilter(i)}
          />
        </div>
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .filter-overflow-popover {
    padding: var(--spacing-2);
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: var(--small-BorderRadius);
    box-shadow: var(--theme-popup-shadow);
    max-width: 480px;
    /* Stack above the Gantt week headers / grid that show through when
       --theme-popup-color is partially transparent in custom themes. */
    backdrop-filter: blur(2px);
  }
  .title {
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: var(--spacing-1_5);
    color: var(--theme-caption-color);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .row {
    display: flex;
    align-items: center;
  }
</style>
