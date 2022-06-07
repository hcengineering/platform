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
  import { SortingOrder, WithLookup, Ref, Doc } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, ProgressCircle, showPopup, SelectPopup, closeTooltip, showPanel } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import tracker from '../../../plugin'

  export let issue: Issue
  export let currentTeam: Team | undefined
  export let issueStatuses: WithLookup<IssueStatus>[] | undefined

  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'inline'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-contet'

  const subIssuesQuery = createQuery()
  let btn: HTMLElement

  let subIssues: Issue[] | undefined
  let doneStatus: Ref<Doc> | undefined
  let countComplate: number = 0

  $: hasSubIssues = issue.subIssues > 0
  $: subIssuesQuery.query(tracker.class.Issue, { attachedTo: issue._id }, async (result) => (subIssues = result), {
    sort: { rank: SortingOrder.Ascending }
  })
  $: if (issueStatuses && subIssues) {
    doneStatus = issueStatuses.find((s) => s.category === tracker.issueStatusCategory.Completed)?._id ?? undefined
    if (doneStatus) countComplate = subIssues.filter((si) => si.status === doneStatus).length
  }

  function getIssueStatusIcon (issue: Issue) {
    return issueStatuses?.find((s) => issue.status === s._id)?.$lookup?.category?.icon ?? null
  }

  function getIssueId (issue: Issue) {
    return `${currentTeam?.identifier}-${issue.number}`
  }

  function openIssue (target: Ref<Issue>) {
    if (target !== issue._id) {
      showPanel(tracker.component.EditIssue, target, issue._class, 'content')
    }
  }

  function showSubIssues () {
    if (subIssues) {
      closeTooltip()
      showPopup(
        SelectPopup,
        {
          value: subIssues.map((iss) => ({
            id: iss._id,
            icon: getIssueStatusIcon(iss),
            text: `${getIssueId(iss)} ${iss.title}`,
            isSelected: iss._id === issue._id
          })),
          width: 'large'
        },
        {
          getBoundingClientRect: () => {
            const rect = btn.getBoundingClientRect()
            const offsetX = 0
            const offsetY = 0

            return DOMRect.fromRect({ width: 1, height: 1, x: rect.left + offsetX, y: rect.bottom + offsetY })
          }
        },
        (selectedIssue) => selectedIssue !== undefined && openIssue(selectedIssue)
      )
    }
  }
</script>

{#if hasSubIssues}
  <div class="clear-mins" bind:this={btn}>
    <Button
      {width}
      {kind}
      {size}
      {justify}
      on:click={(ev) => {
        ev.stopPropagation()
        if (subIssues) showSubIssues()
      }}
    >
      <svelte:fragment slot="content">
        {#if subIssues}
          <div class="flex-row-center content-color text-sm">
            <div class="mr-1">
              <ProgressCircle bind:value={countComplate} bind:max={subIssues.length} size={'inline'} primary />
            </div>
            {countComplate}/{subIssues.length}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  </div>
{/if}
