<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import type { FilterCategory, FilterOption, ActiveFilter } from '../types'
  import IconCheck from './icons/Check.svelte'

  export let category: FilterCategory
  export let activeFilters: ActiveFilter[] = []
  export let onFilterChange: (filter: ActiveFilter) => void
  export let onFilterRemove: (categoryId: string) => void

  function selectOption (option: FilterOption): void {
    const filter: ActiveFilter = {
      categoryId: category.id,
      optionId: option.id,
      categoryLabel: category.label,
      optionLabel: option.label
    }
    onFilterChange(filter)
  }

  function clearFilter (): void {
    onFilterRemove(category.id)
  }

  function isSelected (optionId: string): boolean {
    return activeFilters.some((f) => f.categoryId === category.id && f.optionId === optionId)
  }

  $: activeFilter = activeFilters.find((f) => f.categoryId === category.id)
</script>

<div class="filter-option-popup">
  <div class="popup-header">
    <span class="popup-title">{category.label}</span>
  </div>
  <div class="option-list">
    {#each category.options as option (option.id)}
      <button
        class="option-item"
        class:selected={isSelected(option.id)}
        on:click={() => {
          selectOption(option)
        }}
      >
        <span class="option-label">{option.label}</span>
        {#if isSelected(option.id)}
          <IconCheck size={'small'} />
        {/if}
      </button>
    {/each}
    {#if activeFilter}
      <div class="divider"></div>
      <button class="option-item clear-option" on:click={clearFilter}>
        <span class="option-label">Clear filter</span>
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  .filter-option-popup {
    display: flex;
    flex-direction: column;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    min-width: 10rem;
    max-width: 16rem;
    overflow: hidden;
  }

  .popup-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--theme-popup-divider);
    background: var(--theme-bg-accent-color);
  }

  .popup-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-content-color);
  }

  .option-list {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0;
  }

  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border: none;
    background: none;
    color: var(--theme-content-color);
    cursor: pointer;
    transition: background-color 0.15s ease;
    text-align: left;

    &:hover {
      background: var(--theme-bg-accent-hover);
    }

    &.selected {
      background: var(--theme-primary-bg-color);
      color: var(--theme-primary-color);
    }

    &.clear-option {
      color: var(--theme-warning-color);

      &:hover {
        background: var(--theme-warning-bg-color);
      }
    }
  }

  .option-label {
    font-size: 0.875rem;
    font-weight: 400;
  }

  .divider {
    height: 1px;
    background: var(--theme-popup-divider);
    margin: 0.25rem 0;
  }
</style>
