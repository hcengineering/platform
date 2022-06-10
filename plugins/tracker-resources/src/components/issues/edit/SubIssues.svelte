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
  import { SortingOrder, WithLookup } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { calcRank, Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, Spinner, ExpandCollapse, Tooltip, closeTooltip, IconAdd } from '@anticrm/ui'
  import tracker from '../../../plugin'
  import Collapsed from '../../icons/Collapsed.svelte'
  import Expanded from '../../icons/Expanded.svelte'
  import CreateSubIssue from './CreateSubIssue.svelte'
  import SubIssueList from './SubIssueList.svelte'

  export let issue: Issue
  export let currentTeam: Team | undefined
  export let issueStatuses: WithLookup<IssueStatus>[] | undefined

  const subIssuesQuery = createQuery()
  const client = getClient()

  let subIssues: Issue[] | undefined
  let isCollapsed = false
  let isCreating = false

  async function handleIssueSwap (ev: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    if (subIssues) {
      const { fromIndex, toIndex } = ev.detail
      const [prev, next] = [
        subIssues[fromIndex < toIndex ? toIndex : toIndex - 1],
        subIssues[fromIndex < toIndex ? toIndex + 1 : toIndex]
      ]
      const issue = subIssues[fromIndex]

      await client.update(issue, { rank: calcRank(prev, next) })
    }
  }

  $: hasSubIssues = issue.subIssues > 0
  $: subIssuesQuery.query(tracker.class.Issue, { attachedTo: issue._id }, async (result) => (subIssues = result), {
    sort: { rank: SortingOrder.Ascending }
  })
</script>

<div class="flex-between">
  {#if hasSubIssues}
    <Button
      width="min-content"
      icon={isCollapsed ? Collapsed : Expanded}
      size="small"
      kind="transparent"
      label={tracker.string.SubIssuesList}
      labelParams={{ subIssues: issue.subIssues }}
      on:click={() => {
        isCollapsed = !isCollapsed
        isCreating = false
      }}
    />
  {/if}

  <Tooltip label={tracker.string.AddSubIssues} props={{ subIssues: 1 }} direction="bottom">
    <Button
      id="add-sub-issue"
      width="min-content"
      icon={hasSubIssues ? IconAdd : undefined}
      label={hasSubIssues ? undefined : tracker.string.AddSubIssues}
      labelParams={{ subIssues: 0 }}
      size="small"
      kind="transparent"
      on:click={() => {
        closeTooltip()
        isCreating = true
        isCollapsed = false
      }}
    />
  </Tooltip>
</div>
<div class="mt-1">
  {#if subIssues && issueStatuses && currentTeam}
    <ExpandCollapse isExpanded={!isCollapsed} duration={400}>
      {#if hasSubIssues}
        <div class="list" class:collapsed={isCollapsed}>
          <SubIssueList issues={subIssues} {issueStatuses} {currentTeam} on:move={handleIssueSwap} />
        </div>
      {/if}
    </ExpandCollapse>
    <ExpandCollapse isExpanded={!isCollapsed} duration={400}>
      {#if isCreating}
        <div class="pt-4">
          <CreateSubIssue parentIssue={issue} {issueStatuses} {currentTeam} on:close={() => (isCreating = false)} />
        </div>
      {/if}
    </ExpandCollapse>
  {:else}
    <div class="flex-center pt-3">
      <Spinner />
    </div>
  {/if}
</div>

<style lang="scss">
  .list {
    border-top: 1px solid var(--divider-color);

    &.collapsed {
      padding-top: 1px;
      border-top: none;
    }
  }
</style>
