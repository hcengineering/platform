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
  import { Button, eventToHTMLElement, IconAdd, IconClose, showPopup } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'
  import FilterTypePopup from './FilterTypePopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let filters: Filter[] = []
  let maxIndex = 0

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
        query,
        target,
        index: ++maxIndex,
        onChange
      },
      target
    )
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
            newQuery[filter.key.key][key] = newValue[key]
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

{#if visible}
  <div class="flex pl-4 pr-4">
    {#each filters as filter, i}
      <FilterSection
        {_class}
        {query}
        {filter}
        on:change={() => {
          makeQuery(query, filters)
        }}
        on:remove={() => {
          remove(i)
        }}
      />
    {/each}
    <div class="ml-2">
      <Button
        size="small"
        icon={IconAdd}
        kind={'link-bordered'}
        borderStyle={'dashed'}
        label={view.string.Filter}
        on:click={add}
      />
    </div>
    {#if filters.length}
      <div class="ml-2">
        <Button
          size="small"
          icon={IconClose}
          kind={'link-bordered'}
          borderStyle={'dashed'}
          label={view.string.ClearFilters}
          on:click={() => {
            filters = []
          }}
        />
      </div>
    {/if}
  </div>
{/if}
