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
  import { Button, eventToHTMLElement, IconAdd, showPopup } from '@anticrm/ui'
  import FilterSummarySection from './FilterSummarySection.svelte'
  import StatusFilterMenuSection from './issues/StatusFilterMenuSection.svelte'
  import PriorityFilterMenuSection from './issues/PriorityFilterMenuSection.svelte'
  import { defaultPriorities, getGroupedIssues, IssueFilter } from '../utils'
  import { WithLookup } from '@anticrm/core'
  import { Issue, IssueStatus } from '@anticrm/tracker'

  export let filters: IssueFilter[] = []
  export let issues: Issue[] = []
  export let defaultStatuses: Array<WithLookup<IssueStatus>> = []
  export let onUpdateFilter: (result: { [p: string]: any }, filterIndex: number) => void
  export let onAddFilter: ((event: MouseEvent) => void) | undefined = undefined
  export let onDeleteFilter: (filterIndex?: number) => void
  export let onChangeMode: (index: number) => void

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

<div class="root">
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
    <div class="ml-2">
      <Button kind={'link'} icon={IconAdd} on:click={onAddFilter} />
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    flex: 1 1 auto;
    flex-flow: row wrap;
    align-items: center;
  }
</style>
