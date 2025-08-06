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
  import type { FilterCategory, FilterOption, ActiveFilter } from '../types'
  import IconChevronLeft from './icons/ChevronLeft.svelte'
  import IconCheck from './icons/Check.svelte'
  import Label from './Label.svelte'

  export let categories: FilterCategory[]
  export let activeFilters: ActiveFilter[]
  export let onFilterChange: (filter: ActiveFilter) => void
  export let onFilterRemove: (categoryId: string) => void

  const dispatch = createEventDispatcher()

  // Navigation state
  let selectedCategory: FilterCategory | null = null
  let view: 'categories' | 'options' = 'categories'

  function selectCategory (category: FilterCategory): void {
    selectedCategory = category
    view = 'options'
  }

  function goBackToCategories (): void {
    selectedCategory = null
    view = 'categories'
  }

  function selectOption (option: FilterOption): void {
    if (selectedCategory === null) return

    const filter: ActiveFilter = {
      categoryId: selectedCategory.id,
      optionId: option.id,
      categoryLabel: selectedCategory.label,
      optionLabel: option.label
    }
    onFilterChange(filter)
    dispatch('close')
  }

  function clearCategoryFilter (): void {
    if (selectedCategory === null) return
    onFilterRemove(selectedCategory.id)
    dispatch('close')
  }

  function isActive (categoryId: string): boolean {
    return activeFilters.some((f) => f.categoryId === categoryId)
  }

  function isOptionSelected (optionId: string): boolean {
    if (selectedCategory === null) return false
    return activeFilters.some((f) => f.categoryId === selectedCategory?.id && f.optionId === optionId)
  }

  function getActiveOption (categoryId: string): string {
    const filter = activeFilters.find((f) => f.categoryId === categoryId)
    return filter !== undefined ? filter.optionLabel : ''
  }

  $: currentActiveFilter = (() => {
    if (selectedCategory === null) return null
    return activeFilters.find((f) => f.categoryId === selectedCategory?.id) ?? null
  })()
</script>

<div class="filter-popup">
  {#if view === 'categories'}
    <!-- Categories View -->
    <div class="popup-header">
      <span class="popup-title">Filter by</span>
    </div>
    <div class="category-list">
      {#each categories as category (category.id)}
        <button
          class="category-item"
          class:active={isActive(category.id)}
          on:click={() => {
            selectCategory(category)
          }}
        >
          <span class="category-label"><Label label={category.label} /></span>
          {#if isActive(category.id)}
            <span class="active-value">{getActiveOption(category.id)}</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else if view === 'options' && selectedCategory !== null}
    <!-- Options View -->
    <div class="popup-header">
      <button class="back-button" on:click={goBackToCategories}>
        <IconChevronLeft size={'small'} />
      </button>
      <span class="popup-title"><Label label={selectedCategory.label} /></span>
    </div>
    <div class="option-list">
      {#each selectedCategory.options as option (option.id)}
        <button
          class="option-item"
          class:selected={isOptionSelected(option.id)}
          on:click={() => {
            selectOption(option)
          }}
        >
          <span class="option-label"><Label label={option.label} /></span>
          {#if isOptionSelected(option.id)}
            <IconCheck size={'small'} />
          {/if}
        </button>
      {/each}
      {#if currentActiveFilter !== null}
        <div class="divider"></div>
        <button class="option-item clear-option" on:click={clearCategoryFilter}>
          <span class="option-label">Clear filter</span>
        </button>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .filter-popup {
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
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--theme-popup-divider);
    background: var(--theme-bg-accent-color);
    gap: 0.5rem;
  }

  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: none;
    background: none;
    color: var(--theme-content-color);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease;

    &:hover {
      background: var(--theme-bg-accent-hover);
    }
  }

  .popup-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-content-color);
  }

  .category-list,
  .option-list {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0;
  }

  .category-item,
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

    &.active,
    &.selected {
      background: var(--theme-primary-bg-color);
      color: var(--theme-primary-color);
    }
  }

  .option-item.clear-option {
    color: var(--theme-warning-color);

    &:hover {
      background: var(--theme-warning-bg-hover);
    }
  }

  .category-label,
  .option-label {
    font-size: 0.875rem;
    font-weight: 400;
  }

  .active-value {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-left: 0.5rem;
  }

  .divider {
    height: 1px;
    background: var(--theme-popup-divider);
    margin: 0.25rem 0;
  }
</style>
