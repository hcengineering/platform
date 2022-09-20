<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { Button, eventToHTMLElement, IconAdd, showPopup, Label } from '@hcengineering/ui'
  import FilterSummarySection from './FilterSummarySection.svelte'
  import StatusFilterMenuSection from './issues/StatusFilterMenuSection.svelte'
  import PriorityFilterMenuSection from './issues/PriorityFilterMenuSection.svelte'
  import { defaultPriorities, getGroupedIssues, IssueFilter } from '../utils'
  import { WithLookup } from '@hcengineering/core'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import tracker from '../plugin'

  export let filters: IssueFilter[] = []
  export let issues: Issue[] = []
  export let defaultStatuses: Array<WithLookup<IssueStatus>> = []
  export let onUpdateFilter: (result: { [p: string]: any }, filterIndex: number) => void
  export let onAddFilter: ((event: MouseEvent) => void) | undefined = undefined
  export let onDeleteFilter: (filterIndex?: number) => void
  export let onChangeMode: (index: number) => void

  let allFilters: boolean = true

  $: defaultStatusIds = defaultStatuses.map((x) => x._id)
  $: groupedByStatus = getGroupedIssues('status', issues, defaultStatusIds)
  $: groupedByPriority = getGroupedIssues('priority', issues, defaultPriorities)

  const handleEditFilterMenuOpened = (event: MouseEvent, type: string, index: number) => {
    switch (type) {
      case 'status': {
        const statusGroups: { [key: string]: number } = {}

        for (const status of defaultStatuses) {
          statusGroups[status._id] = groupedByStatus[status._id]?.length ?? 0
        }

        const { mode, query } = filters[index]
        const currentFilterQuery = query as { [p: string]: { $in?: any[]; $nin?: any[] } } | undefined

        showPopup(
          StatusFilterMenuSection,
          {
            groups: statusGroups,
            statuses: defaultStatuses,
            selectedElements: currentFilterQuery?.status?.[mode] ?? [],
            index,
            onUpdate: onUpdateFilter
          },
          eventToHTMLElement(event)
        )

        break
      }
      case 'priority': {
        const priorityGroups: { [key: string]: number } = {}

        for (const priority of defaultPriorities) {
          priorityGroups[priority] = groupedByPriority[priority]?.length ?? 0
        }

        const { mode, query } = filters[index]
        const currentFilterQuery = query as { [p: string]: { $in?: any[]; $nin?: any[] } } | undefined

        showPopup(
          PriorityFilterMenuSection,
          {
            groups: priorityGroups,
            selectedElements: currentFilterQuery?.priority?.[mode] ?? [],
            index,
            onUpdate: onUpdateFilter
          },
          eventToHTMLElement(event)
        )

        break
      }
    }
  }
</script>

{#if filters}
  <div class="filterbar-container">
    <div class="filters">
      {#each filters as filter, filterIndex}
        {@const [key, value] = Object.entries(filter.query)[0]}
        <FilterSummarySection
          type={key}
          mode={filter.mode}
          selectedFilters={value?.[filter.mode]}
          onDelete={() => onDeleteFilter(filterIndex)}
          onChangeMode={() => onChangeMode(filterIndex)}
          onEditFilter={(event) => handleEditFilterMenuOpened(event, key, filterIndex)}
        />
      {/each}
      {#if onAddFilter}
        <div class="add-filter">
          <Button kind={'transparent'} size={'small'} icon={IconAdd} on:click={onAddFilter} />
        </div>
      {/if}
    </div>

    <div class="buttons-group small-gap">
      {#if filters.length > 1}
        <div class="flex-baseline">
          <span class="overflow-label">
            <Label label={tracker.string.IncludeItemsThatMatch} />
          </span>
          <button
            class="filter-button"
            on:click={() => {
              allFilters = !allFilters
            }}
          >
            <Label label={allFilters ? tracker.string.AllFilters : tracker.string.AnyFilter} />
          </button>
        </div>
        <div class="buttons-divider" />
      {/if}
      <Button icon={tracker.icon.Views} label={tracker.string.Save} size={'small'} width={'fit-content'} />
    </div>
  </div>
{/if}

<style lang="scss">
  .filterbar-container {
    display: flex;
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
      margin-bottom: -0.375rem;
      min-width: 0;
    }
    .add-filter {
      margin-bottom: 0.375rem;
    }

    .filter-button {
      display: flex;
      align-items: baseline;
      flex-shrink: 0;
      padding: 0 0.375rem;
      height: 1.5rem;
      min-width: 1.5rem;
      white-space: nowrap;
      line-height: 150%;
      color: var(--accent-color);
      background-color: transparent;
      border-radius: 0.25rem;
      transition-duration: background-color 0.15s ease-in-out;

      &:hover {
        color: var(--caption-color);
        background-color: var(--noborder-bg-hover);
      }
    }
  }
</style>
