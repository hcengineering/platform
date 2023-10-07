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
  import { DocumentQuery, FindResult, Ref, SortingOrder } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Project, Milestone, MilestoneStatus } from '@hcengineering/tracker'
  import ui, {
    IconCheck,
    Icon,
    Label,
    Loading,
    deviceOptionsStore,
    resizeObserver,
    EditWithIcon,
    IconSearch
  } from '@hcengineering/ui'
  import { FILTER_DEBOUNCE_MS, sortFilterValues } from '@hcengineering/view-resources'
  import view, { Filter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { milestoneStatusAssets } from '../../types'
  import MilestoneTitlePresenter from './MilestoneTitlePresenter.svelte'

  export let space: Ref<Project> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = filter.modes ?? [view.filter.FilterObjectIn, view.filter.FilterObjectNin]
  filter.mode = filter.mode ?? filter.modes[0]

  const dispatch = createEventDispatcher()
  let search: string = ''

  let values: Milestone[] = []
  let objectsPromise: Promise<FindResult<Milestone>> | undefined = undefined
  let selectedValues: Set<Ref<Milestone> | undefined | null> = new Set()

  let filterUpdateTimeout: any | undefined

  const client = getClient()
  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    values = []
    selectedValues.clear()
    const spaceQuery: DocumentQuery<Milestone> = space ? { space } : {}
    const resultQuery: DocumentQuery<Milestone> =
      search !== ''
        ? {
            label: { $like: '%' + search + '%' }
          }
        : {}
    objectsPromise = client.findAll(
      tracker.class.Milestone,
      { ...resultQuery, ...spaceQuery },
      {
        sort: { label: SortingOrder.Ascending }
      }
    )
    const res = await objectsPromise

    values = res
    selectedValues = new Set(res.map((p) => p._id).filter((p) => filter.value.includes(p)))
    if (filter.value.includes(undefined) || filter.value.includes(null)) {
      selectedValues.add(undefined)
    }
    objectsPromise = undefined
  }

  function isSelected (value: Ref<Milestone> | undefined, values: Set<Ref<Milestone> | undefined | null>): boolean {
    return values.has(value)
  }

  function handleFilterToggle (value: Ref<Milestone> | undefined): void {
    if (isSelected(value, selectedValues)) {
      selectedValues.delete(value)
    } else {
      selectedValues.add(value)
    }
    selectedValues = selectedValues

    updateFilter(selectedValues)
  }

  function updateFilter (newValues: Set<Ref<Milestone> | null | undefined>) {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      filter.value = Array.from(newValues)
      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  function getStatusItem (status: MilestoneStatus, docs: Milestone[]): Milestone[] {
    let vals = docs.filter((p) => p.status === status)
    vals = sortFilterValues(vals, (v) => isSelected(v._id, selectedValues))
    return vals
  }

  function getStatuses (): MilestoneStatus[] {
    const res = Array.from(Object.values(MilestoneStatus).filter((v) => !isNaN(Number(v)))) as MilestoneStatus[]
    return res
  }

  $: getValues(search)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      placeholder={presentation.string.Search}
    />
  </div>
  <div class="scroll">
    <div class="box">
      {#if objectsPromise}
        <Loading />
      {:else}
        <button
          class="menu-item no-focus flex-row-center"
          on:click={() => {
            handleFilterToggle(undefined)
          }}
        >
          <div class="overflow-label flex-grow">
            <Label label={ui.string.NotSelected} />
          </div>
          <div class="check pointer-events-none">
            {#if isSelected(undefined, selectedValues)}
              <Icon icon={IconCheck} size={'small'} />
            {/if}
          </div>
        </button>
        {#each getStatuses() as group}
          {@const status = milestoneStatusAssets[group]}
          {@const items = getStatusItem(group, values)}
          {#if items.length > 0}
            <div class="menu-separator" />
            <div class="menu-group__header">
              <div class="flex-row-center gap-2">
                <Icon icon={status.icon} size={'small'} />
                <span class="overflow-label"><Label label={status.label} /></span>
              </div>
            </div>
            {#each items as doc}
              <button
                class="menu-item no-focus flex-row-center"
                on:click={() => {
                  handleFilterToggle(doc._id)
                }}
              >
                <div class="flex-grow clear-mins">
                  <MilestoneTitlePresenter value={doc} />
                </div>
                <div class="check pointer-events-none">
                  {#if isSelected(doc._id, selectedValues)}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              </button>
            {/each}
          {/if}
        {/each}
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>
