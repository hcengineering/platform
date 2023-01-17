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
  import { Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { calcRank, Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { Button, Spinner, ExpandCollapse, closeTooltip, IconAdd, Chevron, Label } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import CreateSubIssue from './CreateSubIssue.svelte'
  import SubIssueList from './SubIssueList.svelte'

  export let issue: Issue
  export let teams: Map<Ref<Team>, Team>
  export let issueStatuses: Map<Ref<Team>, WithLookup<IssueStatus>[]>

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
    sort: { rank: SortingOrder.Ascending },
    lookup: {
      _id: {
        subIssues: tracker.class.Issue
      }
    }
  })
</script>

<div class="flex-between">
  {#if hasSubIssues}
    <Button
      width="min-content"
      size="small"
      kind="transparent"
      on:click={() => {
        isCollapsed = !isCollapsed
        isCreating = false
      }}
    >
      <svelte:fragment slot="content">
        <Chevron size={'small'} expanded={!isCollapsed} outline fill={'var(--caption-color)'} marginRight={'.375rem'} />
        <Label label={tracker.string.SubIssuesList} params={{ subIssues: issue.subIssues }} />
      </svelte:fragment>
    </Button>
  {/if}

  <Button
    id="add-sub-issue"
    width="min-content"
    icon={hasSubIssues ? IconAdd : undefined}
    label={hasSubIssues ? undefined : tracker.string.AddSubIssues}
    labelParams={{ subIssues: 0 }}
    kind={'transparent'}
    size={'small'}
    showTooltip={{ label: tracker.string.AddSubIssues, props: { subIssues: 1 }, direction: 'bottom' }}
    on:click={() => {
      closeTooltip()
      isCreating = true
      isCollapsed = false
    }}
  />
</div>
<div class="mt-1">
  {#if subIssues && issueStatuses}
    <ExpandCollapse isExpanded={!isCollapsed} duration={400}>
      {#if hasSubIssues}
        <div class="list" class:collapsed={isCollapsed}>
          <SubIssueList
            issues={subIssues}
            {issueStatuses}
            {teams}
            on:issue-focus={() => (isCreating = false)}
            on:move={handleIssueSwap}
          />
        </div>
      {/if}
    </ExpandCollapse>
    <ExpandCollapse isExpanded={!isCollapsed} duration={400}>
      {#if isCreating}
        {@const team = teams.get(issue.space)}
        {@const statuses = issueStatuses.get(issue.space)}
        {#if team !== undefined && statuses !== undefined}
          <div class="pt-4">
            <CreateSubIssue
              parentIssue={issue}
              issueStatuses={statuses}
              currentTeam={team}
              on:close={() => (isCreating = false)}
            />
          </div>
        {/if}
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
