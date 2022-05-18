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
  let isNew = true

  function onChange (e: Filter | undefined) {
    if (e === undefined) return
    if (isNew) {
      filters.push(e)
      isNew = false
      filters = filters
    } else {
      filters[filters.length - 1] = e
      filters = filters
    }
  }

  function add (e: MouseEvent) {
    const target = eventToHTMLElement(e)
    isNew = true
    showPopup(
      FilterTypePopup,
      {
        _class,
        makeQuery: (key: string) => makeQuery(filters, key),
        target,
        onChange
      },
      target
    )
  }

  function remove (i: number) {
    filters.splice(i, 1)
    filters = filters
  }

  function makeQuery (filters: Filter[], skipKey?: string): DocumentQuery<Doc> {
    const newQuery = hierarchy.clone(query)
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i]
      if (skipKey !== undefined && filter.key.key === skipKey) continue
      if (newQuery[filter.key.key] === undefined) {
        newQuery[filter.key.key] = filter.mode.result(filter.value)
      } else {
        Object.assign(newQuery[filter.key.key], filter.mode.result(filter.value))
      }
    }
    if (skipKey === undefined) {
      dispatch('change', newQuery)
    }
    return newQuery
  }

  $: makeQuery(filters)

  $: clazz = hierarchy.getClass(_class)
  $: visible = hierarchy.hasMixin(clazz, view.mixin.ClassFilters)
</script>

{#if visible}
  <div class="flex p-4">
    {#each filters as filter, i}
      <FilterSection
        {_class}
        query={makeQuery(filters, filter.key.key)}
        {filter}
        on:change={() => {
          makeQuery(filters)
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
