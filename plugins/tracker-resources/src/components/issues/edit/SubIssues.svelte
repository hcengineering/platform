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
  import { Ref } from '@hcengineering/core'
  import { Issue, Project, trackerId } from '@hcengineering/tracker'
  import { Button, IconScaleFull, Label, closeTooltip, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { createFilter, setFilters } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import QueryIssuesList from './QueryIssuesList.svelte'

  export let issue: Issue
  export let projects: Map<Ref<Project>, Project> | undefined
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
  {projects}
  {shouldSaveDraft}
  on:docs={(evt) => {
    size = evt.detail.length
  }}
>
  <svelte:fragment slot="chevron">
    <Label label={tracker.string.SubIssuesList} params={{ subIssues: size }} />
  </svelte:fragment>
  <svelte:fragment slot="buttons">
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
  </svelte:fragment>
</QueryIssuesList>
