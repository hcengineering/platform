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
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, IconFilter, eventToHTMLElement, resolvedLocationStore, showPopup } from '@hcengineering/ui'
  import { Filter, ViewOptions } from '@hcengineering/view'
  import { filterStore, getFilterKey, selectedFilterStore, updateFilter } from '../../filter'
  import view from '../../plugin'
  import FilterTypePopup from './FilterTypePopup.svelte'
  import { onDestroy } from 'svelte'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined = undefined
  export let viewOptions: ViewOptions | undefined = undefined
  export let adaptive: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  resolvedLocationStore.subscribe(() => {
    if ($selectedFilterStore === undefined) {
      load(_class)
    }
  })

  function load (_class: Ref<Class<Doc>> | undefined): void {
    const key = getFilterKey(_class)
    const items = localStorage.getItem(key)
    if (items !== null) {
      filterStore.set(JSON.parse(items))
    }
  }

  function save (_class: Ref<Class<Doc>> | undefined, p: Filter[]): void {
    const key = getFilterKey(_class)
    localStorage.setItem(key, JSON.stringify(p))
  }

  filterStore.subscribe((p) => {
    save(_class, p)
  })

  function nextFilterIndex (): number {
    const current = $filterStore.map((f) => f.index)
    return current.length === 0 ? 1 : Math.max(...current) + 1
  }

  function onChange (e: Filter | undefined): void {
    if (e !== undefined) updateFilter(e)
  }

  onDestroy(() => {
    _class = undefined
  })

  function add (e: MouseEvent): void {
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        space,
        target,
        index: nextFilterIndex(),
        onChange,
        viewOptions
      },
      target
    )
  }

  export let visible: boolean = false
  $: {
    if (_class) {
      visible = hierarchy.classHierarchyMixin(_class, view.mixin.ClassFilters) !== undefined
    } else visible = false
  }
</script>

{#if visible}
  <!-- Always opens the add-filter popup. Clearing all filters is a
       separate affordance (see <InlineFilterChips> trailing "Clear all"
       button); the old toggle behaviour left users with no way to add a
       second filter once one was present. -->
  <Button
    icon={$filterStore.length === 0 ? IconFilter : IconAdd}
    label={adaptive ? undefined : $filterStore.length === 0 ? view.string.Filter : view.string.AddFilter}
    kind={'regular'}
    size={'medium'}
    showTooltip={{ label: $filterStore.length === 0 ? view.string.Filter : view.string.AddFilter }}
    on:click={add}
  />
{/if}
