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
  import { getResource } from '@hcengineering/platform'
  import { getClient, hasResource } from '@hcengineering/presentation'
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
  let selectedFiltersRefs: Ref<Doc>[] | 'All' =
    saved !== null && saved !== undefined ? (JSON.parse(saved) as Ref<Doc>[] | 'All') : 'All'
  let selectedFilters: ActivityFilter[] = []
  $: localStorage.setItem('activity-filter', JSON.stringify(selectedFiltersRefs))
  client.findAll(activity.class.ActivityFilter, {}).then((res) => {
    filters = res
    if (saved !== null && saved !== undefined) {
      const temp: Ref<Doc>[] | 'All' = JSON.parse(saved)
      if (temp !== 'All' && Array.isArray(temp)) {
        selectedFiltersRefs = temp.filter((it) => filters.findIndex((f) => it === f._id) > -1)
        if ((selectedFiltersRefs as Ref<Doc>[]).length === 0) {
          selectedFiltersRefs = 'All'
        }
      } else {
        selectedFiltersRefs = 'All'
      }
    }
  })

  function getAdditionalComponent (_class: Ref<Class<Doc>>): AnyComponent | undefined {
    const hierarchy = client.getHierarchy()
    const mixin = hierarchy.classHierarchyMixin(_class, activity.mixin.ExtraActivityComponent, (m) =>
      hasResource(m.component)
    )
    if (mixin !== undefined) {
      return mixin.component
    }
  }

  let extraComponent = getAdditionalComponent(object._class)
  $: extraComponent = getAdditionalComponent(object._class)

  const handleOptions = (ev: MouseEvent) => {
    showPopup(
      FilterPopup,
      { selectedFiltersRefs, filters },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        if (res === undefined) return
        const selected = res.value as Ref<Doc>[]
        const isAll = selected.length === filters.length || selected.length === 0
        if (res.action === 'select') selectedFiltersRefs = isAll ? 'All' : selected
      }
    )
  }

  const dispatch = createEventDispatcher()

  async function updateFilterActions (
    txes: DisplayTx[],
    filters: ActivityFilter[],
    selected: Ref<Doc>[] | 'All'
  ): Promise<void> {
    if (selected === 'All') {
      filtered = txes
      dispatch('update', filtered)
    } else {
      selectedFilters = filters.filter((filter) => selected.includes(filter._id))
      const filterActions: ((tx: DisplayTx, _class?: Ref<Doc>) => boolean)[] = []
      for (const filter of selectedFilters) {
        const fltr = await getResource(filter.filter)
        filterActions.push(fltr)
      }
      filtered = txes.filter((it) => filterActions.some((f) => f(it, object._class)))
      dispatch('update', filtered)
    }
  }

  $: updateFilterActions(txes, filters, selectedFiltersRefs)
</script>

{#if selectedFiltersRefs === 'All'}
  <div class="antiSection-header__tag highlight">
    <Label label={activityPlg.string.All} />
  </div>
{:else}
  {#each selectedFilters as filter}
    <div class="antiSection-header__tag overflow-label">
      <Label label={filter.label} />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="tag-icon"
        on:click={() => {
          if (selectedFiltersRefs !== 'All') {
            const ids = selectedFiltersRefs.filter((it) => it !== filter._id)
            selectedFiltersRefs = ids.length > 0 ? ids : 'All'
          }
        }}
      >
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
