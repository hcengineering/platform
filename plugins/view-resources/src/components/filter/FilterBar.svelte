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
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, eventToHTMLElement, getCurrentLocation, showPopup } from '@hcengineering/ui'
  import { Filter, FilteredView, ViewOptions, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { filterStore, removeFilter, updateFilter, selectedFilterStore } from '../../filter'
  import view from '../../plugin'
  import FilterSave from './FilterSave.svelte'
  import FilterSection from './FilterSection.svelte'
  import FilterTypePopup from './FilterTypePopup.svelte'
  import { activeViewlet, getActiveViewletId, makeViewletKey } from '../../utils'
  import { getViewOptions, viewOptionStore } from '../../viewOptions'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc>
  export let viewOptions: ViewOptions | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let maxIndex = 1

  function onChange (e: Filter | undefined) {
    if (e === undefined) return
    updateFilter(e)
  }

  function add (e: MouseEvent) {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        target,
        space,
        index: ++maxIndex,
        onChange
      },
      target
    )
  }

  async function saveFilteredView () {
    showPopup(FilterSave, { viewOptions, _class })
  }

  async function saveCurrentFilteredView (filter: FilteredView | undefined) {
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

  async function makeQuery (query: DocumentQuery<Doc>, filters: Filter[]): Promise<void> {
    const newQuery = hierarchy.clone(query)
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i]
      const mode = await client.findOne(view.class.FilterMode, { _id: filter.mode })
      if (mode === undefined) continue
      const result = await getResource(mode.result)
      const newValue = await result(filter, () => {
        makeQuery(query, filters)
      })

      let filterKey = filter.key.key

      const attr = client.getHierarchy().getAttribute(filter.key._class, filter.key.key)
      if (client.getHierarchy().isMixin(attr.attributeOf)) {
        filterKey = attr.attributeOf + '.' + filter.key.key
      }

      if (newQuery[filterKey] === null || newQuery[filterKey] === undefined) {
        newQuery[filterKey] = newValue
      } else {
        let merged = false
        for (const key in newValue) {
          if (newQuery[filterKey][key] === undefined) {
            if (key === '$in' && typeof newQuery[filterKey] === 'string') {
              newQuery[filterKey] = { $in: newValue[key].filter((p: any) => p === newQuery[filterKey]) }
            } else {
              newQuery[filterKey][key] = newValue[key]
            }
            merged = true
            continue
          }
          if (key === '$in') {
            newQuery[filterKey][key] = newQuery[filterKey][key].filter((p: any) => newValue[key].includes(p))
            merged = true
            continue
          }
          if (key === '$nin') {
            newQuery[filterKey][key] = [...newQuery[filterKey][key], ...newValue[key]]
            merged = true
            continue
          }
          if (key === '$lt') {
            newQuery[filterKey][key] =
              newQuery[filterKey][key] < newValue[key] ? newQuery[filterKey][key] : newValue[key]
            merged = true
            continue
          }
          if (key === '$gt') {
            newQuery[filterKey][key] =
              newQuery[filterKey][key] > newValue[key] ? newQuery[filterKey][key] : newValue[key]
            merged = true
            continue
          }
        }
        if (!merged) {
          Object.assign(newQuery[filterKey], newValue)
        }
      }
    }
    dispatch('change', newQuery)
  }

  $: makeQuery(query, $filterStore)

  $: clazz = hierarchy.getClass(_class)
  $: visible = hierarchy.hasMixin(clazz, view.mixin.ClassFilters)

  const me = getCurrentAccount()._id

  function selectedFilterChanged (
    selectedFilter: FilteredView | undefined,
    filters: Filter[],
    activeViewlet: Record<string, Ref<Viewlet> | null>,
    viewOptionStore: Map<string, ViewOptions>
  ): boolean {
    if (selectedFilter === undefined) return false
    if (selectedFilter.createdBy !== me) return false
    const loc = getCurrentLocation()
    const key = makeViewletKey(loc)
    if (selectedFilter.viewletId !== activeViewlet[key]) return true
    if (selectedFilter.filters !== JSON.stringify(filters)) return true
    if (selectedFilter.viewletId !== null) {
      const viewOptions = getViewOptions({ _id: selectedFilter.viewletId } as Viewlet, viewOptionStore)
      if (JSON.stringify(selectedFilter.viewOptions) !== JSON.stringify(viewOptions)) return true
    }
    return false
  }
</script>

{#if visible && $filterStore && $filterStore.length > 0}
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
          on:remove={() => {
            removeFilter(i)
          }}
        />
      {/each}
      <div class="add-filter">
        <Button size={'small'} icon={IconAdd} kind={'ghost'} on:click={add} />
      </div>
    </div>

    <div class="flex gap-1-5">
      <Button
        icon={view.icon.Views}
        label={view.string.SaveAs}
        width={'fit-content'}
        on:click={() => saveFilteredView()}
      />
      {#if selectedFilterChanged($selectedFilterStore, $filterStore, $activeViewlet, $viewOptionStore)}
        <Button
          icon={view.icon.Views}
          label={view.string.Save}
          width={'fit-content'}
          on:click={() => saveCurrentFilteredView($selectedFilterStore)}
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
    padding: 0.5rem 2.25rem;
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

    // .filter-button {
    //   display: flex;
    //   align-items: baseline;
    //   flex-shrink: 0;
    //   padding: 0 0.375rem;
    //   height: 1.5rem;
    //   min-width: 1.5rem;
    //   white-space: nowrap;
    //   line-height: 150%;
    //   color: var(--accent-color);
    //   background-color: transparent;
    //   border-radius: 0.25rem;
    //   transition-duration: background-color 0.15s ease-in-out;

    //   &:hover {
    //     color: var(--caption-color);
    //     background-color: var(--noborder-bg-hover);
    //   }
    // }
  }
</style>
