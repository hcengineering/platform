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
  import { Class, Doc, DocumentQuery, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Button, eventToHTMLElement, IconAdd, showPopup } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'
  import FilterTypePopup from './FilterTypePopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let filters: Filter[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let maxIndex = 1
  // const allFilters: boolean = true

  function onChange (e: Filter | undefined) {
    if (e === undefined) return
    const index = filters.findIndex((p) => p.index === e.index)
    if (index === -1) {
      filters.push(e)
      filters = filters
    } else {
      filters[index] = e
      filters = filters
    }
  }

  function add (e: MouseEvent) {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        target,
        index: ++maxIndex,
        onChange
      },
      target
    )
  }

  $: clear(_class)

  function clear (_class: Ref<Class<Doc>>) {
    filters.map((p) => p.onRemove?.())
    filters = []
  }

  function remove (i: number) {
    filters[i]?.onRemove?.()
    filters.splice(i, 1)
    filters = filters
  }

  async function makeQuery (query: DocumentQuery<Doc>, filters: Filter[]): Promise<void> {
    const newQuery = hierarchy.clone(query)
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i]
      const newValue = await filter.mode.result(filter.value, () => {
        makeQuery(query, filters)
      })
      if (newQuery[filter.key.key] === undefined) {
        newQuery[filter.key.key] = newValue
      } else {
        let merged = false
        for (const key in newValue) {
          if (newQuery[filter.key.key][key] === undefined) {
            if (key === '$in' && typeof newQuery[filter.key.key] === 'string') {
              newQuery[filter.key.key] = { $in: newValue[key].filter((p: any) => p === newQuery[filter.key.key]) }
            } else {
              newQuery[filter.key.key][key] = newValue[key]
            }
            merged = true
            continue
          }
          if (key === '$in') {
            newQuery[filter.key.key][key] = newQuery[filter.key.key][key].filter((p: any) => newValue[key].includes(p))
            merged = true
            continue
          }
          if (key === '$nin') {
            newQuery[filter.key.key][key] = [...newQuery[filter.key.key][key], ...newValue[key]]
            merged = true
            continue
          }
          if (key === '$lt') {
            newQuery[filter.key.key][key] =
              newQuery[filter.key.key][key] < newValue[key] ? newQuery[filter.key.key][key] : newValue[key]
            merged = true
            continue
          }
          if (key === '$gt') {
            newQuery[filter.key.key][key] =
              newQuery[filter.key.key][key] > newValue[key] ? newQuery[filter.key.key][key] : newValue[key]
            merged = true
            continue
          }
        }
        if (!merged) {
          Object.assign(newQuery[filter.key.key], newValue)
        }
      }
    }
    dispatch('change', newQuery)
  }

  $: makeQuery(query, filters)

  $: clazz = hierarchy.getClass(_class)
  $: visible = hierarchy.hasMixin(clazz, view.mixin.ClassFilters)
</script>

{#if visible && filters && filters.length > 0}
  <div class="filterbar-container">
    <div class="filters">
      {#each filters as filter, i}
        <FilterSection
          {_class}
          {filter}
          on:change={() => {
            makeQuery(query, filters)
          }}
          on:remove={() => {
            remove(i)
          }}
        />
      {/each}
      <div class="add-filter">
        <Button size={'small'} icon={IconAdd} kind={'transparent'} on:click={add} />
      </div>
    </div>

    <!-- SAVE BUTTON -->
    <!-- <div class="buttons-group small-gap ml-4">
      {#if filters.length > 1}
        <div class="flex-baseline">
          <span class="overflow-label">
            <Label label={view.string.IncludeItemsThatMatch} />
          </span>
          <button
            class="filter-button"
            on:click={() => {
              allFilters = !allFilters
            }}
          >
            <Label label={allFilters ? view.string.AllFilters : view.string.AnyFilter} />
          </button>
        </div>
        <div class="buttons-divider" />
      {/if}
      <Button icon={view.icon.Views} label={view.string.Save} size={'small'} width={'fit-content'} />
    </div> -->
  </div>
{/if}

<style lang="scss">
  .filterbar-container {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem 0.75rem 2.5rem;
    width: 100%;
    min-width: 0;
    border: 1px solid var(--divider-color);
    border-left: none;
    border-right: none;

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
