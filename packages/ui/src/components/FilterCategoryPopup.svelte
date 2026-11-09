<!--
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { LocalizedSearch } from '../search'
  import SearchInput from './SearchInput.svelte'
  import type { DropdownIntlItem, FilterCategory, FilterOption, ActiveFilter } from '../types'
  import IconChevronLeft from './icons/ChevronLeft.svelte'
  import IconCheck from './icons/Check.svelte'
  import Label from './Label.svelte'
  import ui from '../plugin'

  export let categories: FilterCategory[]
  export let activeFilters: ActiveFilter[]
  export let onFilterChange: (filter: ActiveFilter) => void
  export let onFilterRemove: (categoryId: string) => void
  export let onFiltersClear: () => void

  const dispatch = createEventDispatcher<{ close: void }>()

  // Navigation state
  let selectedCategory: FilterCategory | null = null
  let view: 'categories' | 'options' = 'categories'
  let search = ''
  let visibleOptions: FilterOption[] = []
  let searchGeneration = 0
  const localizedSearch = new LocalizedSearch()

  async function updateOptions (category: FilterCategory | null, term: string): Promise<void> {
    const generation = ++searchGeneration
    const options = category?.options ?? []
    if (category?.searchable !== true || term.trim() === '') {
      visibleOptions = options
      return
    }
    const items: Array<[DropdownIntlItem, DropdownIntlItem[]]> = options.map((option) => [
      { id: option.id, label: option.text === undefined ? option.label : getEmbeddedLabel(option.text) },
      []
    ])
    try {
      const matches = await localizedSearch.filter(items, term)
      if (generation !== searchGeneration) return
      const ids = new Set(matches.map(([item]) => item.id))
      visibleOptions = options.filter((option) => ids.has(option.id))
    } catch {
      if (generation === searchGeneration) visibleOptions = options
    }
  }

  $: void updateOptions(selectedCategory, search)
  onDestroy(() => {
    searchGeneration++
  })

  function selectCategory (category: FilterCategory): void {
    selectedCategory = category
    search = ''
    view = 'options'
  }

  function goBackToCategories (): void {
    selectedCategory = null
    search = ''
    view = 'categories'
  }

  function selectOption (option: FilterOption): void {
    if (selectedCategory === null) return

    const filter: ActiveFilter = {
      categoryId: selectedCategory.id,
      optionId: option.id,
      categoryLabel: selectedCategory.label,
      optionLabel: option.label,
      optionText: option.text
    }
    activeFilters = [...activeFilters.filter((candidate) => candidate.categoryId !== selectedCategory?.id), filter]
    onFilterChange(filter)
    goBackToCategories()
  }

  function clearCategoryFilter (): void {
    if (selectedCategory === null) return
    activeFilters = activeFilters.filter((filter) => filter.categoryId !== selectedCategory?.id)
    onFilterRemove(selectedCategory.id)
    goBackToCategories()
  }

  function clearFilters (): void {
    activeFilters = []
    onFiltersClear()
    dispatch('close')
  }

  function isActive (categoryId: string): boolean {
    return activeFilters.some((f) => f.categoryId === categoryId)
  }

  function isOptionSelected (optionId: string): boolean {
    if (selectedCategory === null) return false
    return activeFilters.some((f) => f.categoryId === selectedCategory?.id && f.optionId === optionId)
  }

  function getActiveOption (categoryId: string): ActiveFilter | undefined {
    return activeFilters.find((filter) => filter.categoryId === categoryId)
  }

  $: currentActiveFilter = ((): ActiveFilter | null => {
    if (selectedCategory === null) return null
    return activeFilters.find((f) => f.categoryId === selectedCategory?.id) ?? null
  })()
</script>

<div class="filter-popup">
  {#if view === 'categories'}
    <!-- Categories View -->
    <div class="popup-header">
      <span class="popup-title"><Label label={ui.string.Filter} /></span>
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
            {@const activeFilter = getActiveOption(category.id)}
            {#if activeFilter !== undefined}
              <span class="active-value">
                {#if activeFilter.optionText !== undefined}
                  {activeFilter.optionText}
                {:else}
                  <Label label={activeFilter.optionLabel} />
                {/if}
              </span>
            {/if}
          {/if}
        </button>
      {/each}
      {#if activeFilters.length > 0}
        <div class="divider"></div>
        <button class="category-item clear-option" on:click={clearFilters}>
          <span class="category-label"><Label label={ui.string.Clear} /></span>
        </button>
      {/if}
    </div>
  {:else if view === 'options' && selectedCategory !== null}
    <!-- Options View -->
    <div class="popup-header">
      <button class="back-button" on:click={goBackToCategories}>
        <IconChevronLeft size="small" />
      </button>
      <span class="popup-title"><Label label={selectedCategory.label} /></span>
    </div>
    {#if selectedCategory.searchable === true}
      <div class="option-search"><SearchInput bind:value={search} width="100%" delay={150} /></div>
    {/if}
    <div class="option-list">
      {#each visibleOptions as option (option.id)}
        <button
          class="option-item"
          class:selected={isOptionSelected(option.id)}
          on:click={() => {
            selectOption(option)
          }}
        >
          <span class="option-label">
            {#if option.text !== undefined}
              {option.text}
            {:else}
              <Label label={option.label} />
            {/if}
          </span>
          {#if isOptionSelected(option.id)}
            <IconCheck size="small" />
          {/if}
        </button>
      {/each}
      {#if visibleOptions.length === 0}
        <div class="no-results"><Label label={ui.string.NoResults} /></div>
      {/if}
      {#if currentActiveFilter !== null}
        <div class="divider"></div>
        <button class="option-item clear-option" on:click={clearCategoryFilter}>
          <span class="option-label"><Label label={ui.string.Clear} /></span>
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
    max-height: min(32rem, calc(100dvh - var(--spacing-4)));
  }

  .popup-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--theme-popup-divider);
    background: var(--theme-bg-accent-color);
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .option-search {
    padding: var(--spacing-1);
    flex-shrink: 0;
  }
  .no-results {
    padding: var(--spacing-1) var(--spacing-2);
    color: var(--theme-dark-color);
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
    overflow-y: auto;
    min-height: 0;
  }

  .category-item,
  .option-item {
    display: flex;
    flex-shrink: 0;
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
  }

  .category-item.active,
  .option-item.selected {
    background: var(--theme-primary-bg-color);
    color: var(--theme-primary-color);
  }

  .category-item.clear-option,
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
