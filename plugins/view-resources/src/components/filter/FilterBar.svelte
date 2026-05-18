<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Class, Doc, DocumentQuery, Ref, Space, getCurrentAccount } from '@hcengineering/core'
  import { getClient, reduceCalls } from '@hcengineering/presentation'
  import { Button, IconAdd, eventToHTMLElement, getCurrentLocation, showPopup } from '@hcengineering/ui'
  import { Filter, FilterMode, FilteredView, ViewOptions, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { filterStore, removeFilter, selectedFilterStore, updateFilter } from '../../filter'
  import { makeFilterQuery } from '../../filter/query-builder'
  import view from '../../plugin'
  import { activeViewlet, getActiveViewletId, makeViewletKey } from '../../utils'
  import { getViewOptions, viewOptionStore } from '../../viewOptions'
  import FilterSave from './FilterSave.svelte'
  import FilterSection from './FilterSection.svelte'
  import FilterTypePopup from './FilterTypePopup.svelte'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc>
  export let viewOptions: ViewOptions | undefined = undefined
  export let hideSaveButtons: boolean = false
  // Tracker IssuesView renders its own inline chip strip via <InlineFilterChips>
  // and sets hideChips=true so this component shrinks to just the SaveAs row.
  // Every other consumer keeps the legacy chip rendering — the redesign only
  // covers Tracker.
  export let hideChips: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function onChange (e: Filter | undefined): void {
    if (e !== undefined) updateFilter(e)
  }

  function add (e: MouseEvent): void {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        target,
        space,
        index: $filterStore.map((it) => it.index).reduce((a, b) => Math.max(a, b), 0) + 1,
        onChange
      },
      target
    )
  }

  async function saveFilteredView (): Promise<void> {
    showPopup(FilterSave, { viewOptions, _class })
  }

  async function saveCurrentFilteredView (filter: FilteredView | undefined): Promise<void> {
    if (filter !== undefined) {
      const filters = JSON.stringify($filterStore)
      await client.update(filter, {
        filters,
        viewOptions,
        viewletId: getActiveViewletId()
      })
      selectedFilterStore.set({
        ...filter,
        filters,
        viewOptions,
        viewletId: getActiveViewletId()
      })
    }
  }

  const resolveMode = async (id: Ref<FilterMode>): Promise<FilterMode | undefined> =>
    await client.findOne(view.class.FilterMode, { _id: id })

  const makeQuery = reduceCalls(async (query: DocumentQuery<Doc>, filters: Filter[]): Promise<void> => {
    const next = await makeFilterQuery(query, filters, resolveMode, undefined, hierarchy)
    dispatch('change', next)
  })

  $: makeQuery(query, $filterStore)

  let visible: boolean = false
  $: if (_class) {
    visible = hierarchy.classHierarchyMixin(_class, view.mixin.ClassFilters) !== undefined
  }

  function selectedFilterChanged (
    selectedFilter: FilteredView | undefined,
    filters: Filter[],
    activeViewlet: Record<string, Ref<Viewlet> | null>,
    viewOptionStore: Map<string, ViewOptions>
  ): boolean {
    if (selectedFilter === undefined) return false
    if (!getCurrentAccount().socialIds.includes(selectedFilter.createdBy)) return false
    const loc = getCurrentLocation()
    const key = makeViewletKey(loc)
    if (selectedFilter.viewletId !== activeViewlet[key]) return true
    if (selectedFilter.filters !== JSON.stringify(filters)) return true
    if (selectedFilter.viewletId !== null) {
      const viewOptions = getViewOptions({ _id: selectedFilter.viewletId } as unknown as Viewlet, viewOptionStore)
      if (JSON.stringify(selectedFilter.viewOptions) !== JSON.stringify(viewOptions)) return true
    }
    return false
  }

  $: hasFilters = $filterStore !== undefined && $filterStore.length > 0
  $: showSaveRow =
    visible &&
    hasFilters &&
    !hideSaveButtons &&
    (hideChips || selectedFilterChanged($selectedFilterStore, $filterStore, $activeViewlet, $viewOptionStore))
  $: showChipRow = visible && hasFilters && !hideChips
</script>

{#if showChipRow}
  <div class="filterbar-container">
    <div class="filters">
      {#each $filterStore as filter, i}
        <FilterSection
          {space}
          {filter}
          on:change={() => {
            makeQuery(query, $filterStore)
            updateFilter(filter)
          }}
          on:remove={() => removeFilter(i)}
        />
      {/each}
      <div class="add-filter">
        <Button size={'small'} icon={IconAdd} kind={'ghost'} on:click={add} />
      </div>
    </div>

    {#if !hideSaveButtons}
      <div class="flex gap-1-5">
        <Button
          icon={view.icon.Views}
          label={view.string.SaveAs}
          width={'fit-content'}
          on:click={async () => {
            await saveFilteredView()
          }}
        />
        {#if selectedFilterChanged($selectedFilterStore, $filterStore, $activeViewlet, $viewOptionStore)}
          <Button
            icon={view.icon.Views}
            label={view.string.Save}
            width={'fit-content'}
            on:click={async () => {
              await saveCurrentFilteredView($selectedFilterStore)
            }}
          />
        {/if}
      </div>
    {/if}
  </div>
{:else if showSaveRow}
  <!-- Tracker IssuesView path: chips render elsewhere; this row only
       shows SaveAs / Save buttons when there is something to save. -->
  <div class="filterbar-saveas-container">
    <div class="flex gap-1-5">
      <Button
        icon={view.icon.Views}
        label={view.string.SaveAs}
        width={'fit-content'}
        on:click={async () => {
          await saveFilteredView()
        }}
      />
      {#if selectedFilterChanged($selectedFilterStore, $filterStore, $activeViewlet, $viewOptionStore)}
        <Button
          icon={view.icon.Views}
          label={view.string.Save}
          width={'fit-content'}
          on:click={async () => {
            await saveCurrentFilteredView($selectedFilterStore)
          }}
        />
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .filterbar-container {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-1) var(--spacing-2);
    width: 100%;
    min-width: 0;
    background-color: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);

    .filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      flex-grow: 1;
      margin-bottom: -0.375rem;
      width: 100%;
      min-width: 0;
    }
    .add-filter {
      margin-bottom: 0.375rem;
    }
  }
  .filterbar-saveas-container {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: var(--spacing-1) var(--spacing-2);
    width: 100%;
    min-width: 0;
    background-color: var(--theme-comp-header-color);
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
