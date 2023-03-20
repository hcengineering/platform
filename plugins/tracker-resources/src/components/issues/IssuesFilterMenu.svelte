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
  import { WithLookup } from '@hcengineering/core'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import { showPopup } from '@hcengineering/ui'
  import {
    defaultPriorities,
    FilterAction,
    getGroupedIssues,
    getIssueFilterAssetsByType,
    IssueFilter
  } from '../../utils'
  import FilterMenu from '../FilterMenu.svelte'
  import PriorityFilterMenuSection from './PriorityFilterMenuSection.svelte'
  import ComponentFilterMenuSection from './ComponentFilterMenuSection.svelte'
  import SprintFilterMenuSection from './SprintFilterMenuSection.svelte'
  import StatusFilterMenuSection from './StatusFilterMenuSection.svelte'

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
  $: groupedByComponent = getGroupedIssues('component', issues)
  $: groupedBySprint = getGroupedIssues('sprint', issues)

  const handleStatusFilterMenuSectionOpened = () => {
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

  const handlePriorityFilterMenuSectionOpened = () => {
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

  const handleComponentFilterMenuSectionOpened = () => {
    const componentGroups: { [key: string]: number } = {}

    for (const [component, value] of Object.entries(groupedByComponent)) {
      componentGroups[component] = value?.length ?? 0
    }
    showPopup(
      ComponentFilterMenuSection,
      {
        groups: componentGroups,
        selectedElements: currentFilterQuery?.component?.[currentFilterMode] ?? [],
        index,
        onUpdate,
        onBack
      },
      targetHtml
    )
  }

  const handleSprintFilterMenuSectionOpened = () => {
    const sprintGroups: { [key: string]: number } = {}

    for (const [sprint, value] of Object.entries(groupedBySprint)) {
      sprintGroups[sprint] = value?.length ?? 0
    }
    showPopup(
      SprintFilterMenuSection,
      {
        groups: sprintGroups,
        selectedElements: currentFilterQuery?.sprint?.[currentFilterMode] ?? [],
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
    },
    {
      ...getIssueFilterAssetsByType('component'),
      onSelect: handleComponentFilterMenuSectionOpened
    },
    {
      ...getIssueFilterAssetsByType('sprint'),
      onSelect: handleSprintFilterMenuSectionOpened
    }
  ]
</script>

<FilterMenu {actions} on:close />
