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
  import { Issue, trackerId } from '@hcengineering/tracker'
  import { Button, IconAdd, IconScaleFull, Label, closeTooltip, getCurrentResolvedLocation, navigate, showPopup } from '@hcengineering/ui'
  import { createFilter, restrictionStore, setFilters } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import LinkSubIssueActionPopup from '../../LinkSubIssueActionPopup.svelte'
  import QueryIssuesList from './QueryIssuesList.svelte'

  export let issue: Issue
  export let shouldSaveDraft: boolean = false

  // showPopup(tracker.component.CreateIssue, { space: issue.space, parentIssue: issue, shouldSaveDraft }, 'top')
  export let focusIndex = -1

  let size = issue.subIssues
</script>

<QueryIssuesList
  object={issue}
  query={{ attachedTo: issue._id }}
  createParams={{ space: issue.space, parentIssue: issue }}
  createLabel={tracker.string.AddSubIssues}
  hasSubIssues={issue.subIssues > 0}
  {focusIndex}
  {shouldSaveDraft}
  on:docs={(evt) => {
    size = evt.detail.length
  }}
>
  <svelte:fragment slot="chevron">
    <Label label={tracker.string.SubIssuesList} params={{ subIssues: size }} />
  </svelte:fragment>
  <svelte:fragment slot="buttons">
    <!--
      Link existing as sub-issue: opens LinkSubIssueActionPopup which picks
      an existing issue from the same space and rewrites its `attachedTo` to
      point at this issue. Complement of QueryIssuesList's built-in "create
      new sub-issue" (the createLabel button) — together both flows let the
      user grow the sub-tree without leaving the EditIssue panel.
    -->
    <Button
      icon={IconAdd}
      kind={'ghost'}
      showTooltip={{ label: tracker.string.LinkExistingSubIssue, direction: 'bottom' }}
      on:click={() => {
        showPopup(LinkSubIssueActionPopup, { value: issue }, 'top')
      }}
    />
    {#if !$restrictionStore.disableNavigation}
      <Button
        icon={IconScaleFull}
        kind={'ghost'}
        showTooltip={{ label: tracker.string.OpenSubIssues, direction: 'bottom' }}
        on:click={() => {
          const filter = createFilter(tracker.class.Issue, 'attachedTo', [issue._id])
          if (filter !== undefined) {
            closeTooltip()
            const loc = getCurrentResolvedLocation()
            loc.fragment = undefined
            loc.query = undefined
            loc.path[2] = trackerId
            loc.path[3] = issue.space
            loc.path[4] = 'issues'
            navigate(loc)
            setFilters([filter])
          }
        }}
      />
    {/if}
  </svelte:fragment>
</QueryIssuesList>
