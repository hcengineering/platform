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
  import FilterMenu from '../FilterMenu.svelte'
  import { FilterAction, getGroupedIssues, getIssueFilterAssetsByType } from '../../utils'

  export let targetHtml: HTMLElement
  export let currentFilter: { [p: string]: { $in: any[] } } = {}
  export let defaultStatuses: Array<WithLookup<IssueStatus>> = []
  export let issues: Issue[] = []
  export let onUpdate: (result: { [p: string]: any }) => void
  export let onBack: () => void

  $: defaultStatusIds = defaultStatuses.map((x) => x._id)
  $: groupedByStatus = getGroupedIssues('status', issues, defaultStatusIds)

  const handleStatusFilterMenuSectionOpened = (event: MouseEvent | KeyboardEvent) => {
    const statusGroups: { [key: string]: number } = {}

    for (const defaultStatus of defaultStatuses) {
      statusGroups[defaultStatus._id] = groupedByStatus[defaultStatus._id]?.length ?? 0
    }

    showPopup(
      StatusFilterMenuSection,
      {
        groups: statusGroups,
        statuses: defaultStatuses,
        selectedElements: currentFilter.status?.$in,
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
    }
  ]
</script>

<FilterMenu {actions} on:close />
