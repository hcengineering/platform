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
  import { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, IconAdd, showPopup } from '@hcengineering/ui'
  import { Filter, ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { filterStore, getFilterKey } from '../../filter'
  import view from '../../plugin'
  import FilterSave from './FilterSave.svelte'
  import FilterSection from './FilterSection.svelte'
  import FilterTypePopup from './FilterTypePopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let viewOptions: ViewOptions | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let maxIndex = 1

  function onChange (e: Filter | undefined) {
    if (e === undefined) return
    const index = $filterStore.findIndex((p) => p.index === e.index)
    if (index === -1) {
      $filterStore.push(e)
    } else {
      $filterStore[index] = e
    }
    $filterStore = $filterStore
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

  $: load(_class)

  function remove (i: number) {
    $filterStore[i]?.onRemove?.()
    $filterStore.splice(i, 1)
    $filterStore = $filterStore
  }

  $: saveFilters($filterStore)

  function saveFilters (filters: Filter[]) {
    const key = getFilterKey(_class)
    if (filters.length > 0) {
      localStorage.setItem(key, JSON.stringify(filters))
    } else {
      localStorage.removeItem(key)
    }
  }

  async function saveFilteredView () {
    showPopup(FilterSave, { viewOptions, _class })
  }

  let loading = false

  function load (_class: Ref<Class<Doc>>) {
    loading = true
    const oldFilters = $filterStore
    const key = getFilterKey(_class)
    const saved = localStorage.getItem(key)
    if (saved !== null) {
      $filterStore = JSON.parse(saved)
    } else {
      $filterStore = []
    }
    loading = false
    oldFilters.forEach((p) => p.onRemove?.())
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
</script>

{#if visible && $filterStore && $filterStore.length > 0}
  <div class="filterbar-container">
    <div class="filters">
      {#if !loading}
        {#each $filterStore as filter, i}
          <FilterSection
            {filter}
            on:change={() => {
              makeQuery(query, $filterStore)
              saveFilters($filterStore)
            }}
            on:remove={() => {
              remove(i)
            }}
          />
        {/each}
      {/if}
      <div class="add-filter">
        <Button size={'small'} icon={IconAdd} kind={'transparent'} on:click={add} />
      </div>
    </div>

    <Button
      icon={view.icon.Views}
      label={view.string.Save}
      size={'small'}
      width={'fit-content'}
      on:click={() => saveFilteredView()}
    />
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
