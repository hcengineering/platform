<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import activity, { ActivityFilter, DisplayTx } from '@hcengineering/activity'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { IntlString, getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { ActionIcon, AnyComponent, Icon, Label, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import activityPlg from '../plugin'
  import FilterPopup from './FilterPopup.svelte'
  import IconClose from './icons/Close.svelte'
  import IconFilter from './icons/Filter.svelte'

  export let txes: DisplayTx[]
  export let object: Doc

  let filtered: DisplayTx[]
  const client = getClient()
  let filters: ActivityFilter[] = []
  const saved = localStorage.getItem('activity-filter')
  let selectedFilter: Ref<Doc>[] | 'All' =
    saved !== null && saved !== undefined ? (JSON.parse(saved) as Ref<Doc>[] | 'All') : 'All'
  $: localStorage.setItem('activity-filter', JSON.stringify(selectedFilter))
  client.findAll(activity.class.ActivityFilter, {}).then((res) => {
    filters = res
    if (saved !== null && saved !== undefined) {
      const temp: Ref<Doc>[] | 'All' = JSON.parse(saved)
      if (temp !== 'All' && Array.isArray(temp)) {
        selectedFilter = temp.filter((it) => filters.findIndex((f) => it === f._id) > -1)
        if ((selectedFilter as Ref<Doc>[]).length === 0) {
          selectedFilter = 'All'
        }
      } else {
        selectedFilter = 'All'
      }
    }
  })

  function getAdditionalComponent (_class: Ref<Class<Doc>>): AnyComponent | undefined {
    const hierarchy = client.getHierarchy()
    const mixin = hierarchy.classHierarchyMixin(_class, activity.mixin.ExtraActivityComponent)
    if (mixin !== undefined) {
      return mixin.component
    }
  }

  let extraComponent = getAdditionalComponent(object._class)
  $: extraComponent = getAdditionalComponent(object._class)

  const handleOptions = (ev: MouseEvent) => {
    showPopup(
      FilterPopup,
      { selectedFilter, filters },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        if (res === undefined) return
        if (res.action === 'select') selectedFilter = res.value as Ref<Doc>[] | 'All'
      }
    )
  }

  let labels: IntlString[] = []
  const dispatch = createEventDispatcher()

  async function updateFilterActions (
    txes: DisplayTx[],
    filters: ActivityFilter[],
    selected: Ref<Doc>[] | 'All'
  ): Promise<void> {
    if (selected === 'All') {
      filtered = txes
      if (extraComponent === undefined) {
        dispatch('update', filtered)
      }
    } else {
      const selectedFilters = filters.filter((filter) => selected.includes(filter._id))
      const filterActions: ((tx: DisplayTx, _class?: Ref<Doc>) => boolean)[] = []
      labels = []
      for (const filter of selectedFilters) {
        labels.push(filter.label)
        const fltr = await getResource(filter.filter)
        filterActions.push(fltr)
      }
      filtered = txes.filter((it) => filterActions.some((f) => f(it, object._class)))
      if (extraComponent === undefined) {
        dispatch('update', filtered)
      }
    }
  }

  $: updateFilterActions(txes, filters, selectedFilter)
</script>

{#if selectedFilter === 'All'}
  <div class="antiSection-header__tag highlight">
    <Label label={activityPlg.string.All} />
  </div>
{:else}
  {#each labels as label}
    <div class="antiSection-header__tag overflow-label">
      <Label {label} />
      <div class="tag-icon">
        <Icon icon={IconClose} size={'small'} />
      </div>
    </div>
  {/each}
{/if}
<div class="w-4 min-w-4 max-w-4" />
<ActionIcon icon={IconFilter} size={'medium'} action={handleOptions} />
{#if extraComponent}
  {#await getResource(extraComponent) then comp}
    {#if comp}
      <svelte:component this={comp} {filtered} {object} on:update />
    {/if}
  {/await}
{/if}
