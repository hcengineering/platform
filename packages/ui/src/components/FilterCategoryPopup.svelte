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
  import { createEventDispatcher } from 'svelte'
  import type { FilterCategory, FilterOption, ActiveFilter } from './FilterButton.svelte'
  import { eventToHTMLElement, showPopup } from '../popups'
  import FilterOptionPopup from './FilterOptionPopup.svelte'

  export let categories: FilterCategory[]
  export let activeFilters: ActiveFilter[]
  export let onFilterChange: (filter: ActiveFilter) => void
  export let onFilterRemove: (categoryId: string) => void

  const dispatch = createEventDispatcher()

  function showOptionPopup (category: FilterCategory, e: MouseEvent): void {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterOptionPopup,
      {
        category,
        activeFilters,
        onFilterChange: (filter: ActiveFilter) => {
          onFilterChange(filter)
          dispatch('close')
        },
        onFilterRemove: (categoryId: string) => {
          onFilterRemove(categoryId)
          dispatch('close')
        }
      },
      target
    )
  }

  function isActive (categoryId: string): boolean {
    return activeFilters.some(f => f.categoryId === categoryId)
  }

  function getActiveOption (categoryId: string): string {
    const filter = activeFilters.find(f => f.categoryId === categoryId)
    return filter !== undefined ? filter.optionLabel : ''
  }
</script>

<div class="filter-category-popup">
  <div class="popup-header">
    <span class="popup-title">Filter by</span>
  </div>
  <div class="category-list">
    {#each categories as category (category.id)}
      <button
        class="category-item"
        class:active={isActive(category.id)}
        on:click={(e) => { showOptionPopup(category, e) }}
      >
        <span class="category-label">{category.label}</span>
        {#if isActive(category.id)}
          <span class="active-value">{getActiveOption(category.id)}</span>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .filter-category-popup {
    display: flex;
    flex-direction: column;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    min-width: 12rem;
    max-width: 20rem;
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

  .category-list {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0;
  }

  .category-item {
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

    &.active {
      background: var(--theme-primary-bg-color);
      color: var(--theme-primary-color);
    }
  }

  .category-label {
    font-size: 0.875rem;
    font-weight: 400;
  }

  .active-value {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-left: 0.5rem;
  }
</style>
