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
  import { WithLookup } from '@anticrm/core'
  import { Issue, IssueStatus } from '@anticrm/tracker'
  import { showPopup } from '@anticrm/ui'
  import StatusFilterMenuSection from './StatusFilterMenuSection.svelte'
  import PriorityFilterMenuSection from './PriorityFilterMenuSection.svelte'
  import FilterMenu from '../FilterMenu.svelte'
  import {
    defaultPriorities,
    FilterAction,
    getGroupedIssues,
    getIssueFilterAssetsByType,
    IssueFilter
  } from '../../utils'

  export let targetHtml: HTMLElement
  export let filters: IssueFilter[] = []
  export let index: number = 0
  export let defaultStatuses: Array<WithLookup<IssueStatus>> = []
  export let issues: Issue[] = []
  export let onUpdate: (result: { [p: string]: any }, filterIndex: number) => void
  export let onBack: (() => void) | undefined = undefined

  $: currentFilterQuery = filters[index]?.query as { [p: string]: { $in?: any[]; $nin?: any[] } } | undefined
  $: currentFilterMode = filters[index]?.mode
  $: defaultStatusIds = defaultStatuses.map((x) => x._id)
  $: groupedByStatus = getGroupedIssues('status', issues, defaultStatusIds)
  $: groupedByPriority = getGroupedIssues('priority', issues, defaultPriorities)

  const handleStatusFilterMenuSectionOpened = (event: MouseEvent | KeyboardEvent) => {
    const statusGroups: { [key: string]: number } = {}

    for (const status of defaultStatuses) {
      statusGroups[status._id] = groupedByStatus[status._id]?.length ?? 0
    }

    showPopup(
      StatusFilterMenuSection,
      {
        groups: statusGroups,
        statuses: defaultStatuses,
        selectedElements: currentFilterQuery?.status?.[currentFilterMode] ?? [],
        index,
        onUpdate,
        onBack
      },
      targetHtml
    )
  }

  const handlePriorityFilterMenuSectionOpened = (event: MouseEvent | KeyboardEvent) => {
    const priorityGroups: { [key: string]: number } = {}

    for (const priority of defaultPriorities) {
      priorityGroups[priority] = groupedByPriority[priority]?.length ?? 0
    }

    showPopup(
      PriorityFilterMenuSection,
      {
        groups: priorityGroups,
        selectedElements: currentFilterQuery?.priority?.[currentFilterMode] ?? [],
        index,
        onUpdate,
        onBack
      },
      targetHtml
    )
  }

  const actions: FilterAction[] = [
    {
      ...getIssueFilterAssetsByType('status'),
      onSelect: handleStatusFilterMenuSectionOpened
    },
    {
      ...getIssueFilterAssetsByType('priority'),
      onSelect: handlePriorityFilterMenuSectionOpened
    }
  ]
</script>

<FilterMenu {actions} on:close />
