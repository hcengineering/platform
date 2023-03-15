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
  import { Ref, SortingOrder, toIdMap, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team, trackerId } from '@hcengineering/tracker'
  import {
    Button,
    Chevron,
    closeTooltip,
    ExpandCollapse,
    getCurrentLocation,
    IconScaleFull,
    IconAdd,
    IconArrowRight,
    Label,
    navigate
  } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    createFilter,
    filterStore,
    getViewOptions,
    viewOptionStore,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import CreateSubIssue from './CreateSubIssue.svelte'
  import SubIssueList from './SubIssueList.svelte'

  export let issue: Issue
  export let teams: Map<Ref<Team>, Team>
  export let issueStatuses: Map<Ref<Team>, WithLookup<IssueStatus>[]>

  let subIssueEditorRef: HTMLDivElement
  let isCollapsed = false
  let isCreating = false

  $: hasSubIssues = issue.subIssues > 0

  let viewlet: Viewlet | undefined

  const query = createQuery()
  $: query.query(view.class.Viewlet, { _id: tracker.viewlet.SubIssues }, (res) => {
    ;[viewlet] = res
  })

  let _teams = teams
  let _issueStatuses = issueStatuses

  const teamsQuery = createQuery()

  $: if (teams === undefined) {
    teamsQuery.query(tracker.class.Team, {}, async (result) => {
      _teams = toIdMap(result)
    })
  } else {
    teamsQuery.unsubscribe()
  }

  const statusesQuery = createQuery()
  $: if (issueStatuses === undefined) {
    statusesQuery.query(
      tracker.class.IssueStatus,
      {},
      (statuses) => {
        const st = new Map<Ref<Team>, WithLookup<IssueStatus>[]>()
        for (const s of statuses) {
          const id = s.attachedTo as Ref<Team>
          st.set(id, [...(st.get(id) ?? []), s])
        }
        _issueStatuses = st
      },
      {
        lookup: { category: tracker.class.IssueStatusCategory },
        sort: { rank: SortingOrder.Ascending }
      }
    )
  } else {
    statusesQuery.unsubscribe()
  }

  $: viewOptions = viewlet !== undefined ? getViewOptions(viewlet, $viewOptionStore) : undefined
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
  <div class="flex-row-center">
    {#if viewlet && hasSubIssues && viewOptions}
      <ViewletSettingButton bind:viewOptions {viewlet} kind={'transparent'} />
    {/if}
    {#if hasSubIssues}
      <Button
        width="min-content"
        icon={IconScaleFull}
        kind={'transparent'}
        size={'small'}
        showTooltip={{ label: tracker.string.OpenSubIssues, direction: 'bottom' }}
        on:click={() => {
          const filter = createFilter(tracker.class.Issue, 'attachedTo', [issue._id])
          if (filter !== undefined) {
            closeTooltip()
            const loc = getCurrentLocation()
            loc.fragment = undefined
            loc.query = undefined
            loc.path[2] = trackerId
            loc.path[3] = issue.space
            loc.path[4] = 'issues'
            navigate(loc)
            $filterStore = [filter]
          }
        }}
      />
    {/if}
    <Button
      id="add-sub-issue"
      width="min-content"
      icon={hasSubIssues ? (isCreating ? IconArrowRight : IconAdd) : undefined}
      label={hasSubIssues ? undefined : tracker.string.AddSubIssues}
      labelParams={{ subIssues: 0 }}
      kind={'transparent'}
      size={'small'}
      showTooltip={{ label: tracker.string.AddSubIssues, props: { subIssues: 1 }, direction: 'bottom' }}
      on:click={() => {
        closeTooltip()
        isCreating && subIssueEditorRef && subIssueEditorRef.scrollIntoView({ behavior: 'smooth' })
        isCreating = true
        isCollapsed = false
      }}
    />
  </div>
</div>
<div class="mt-1">
  {#if issueStatuses}
    {#if hasSubIssues && viewOptions && viewlet}
      <ExpandCollapse isExpanded={!isCollapsed} duration={400}>
        <div class="list" class:collapsed={isCollapsed}>
          <SubIssueList
            teams={_teams}
            {viewlet}
            {viewOptions}
            issueStatuses={_issueStatuses}
            query={{ attachedTo: issue._id }}
          />
        </div>
      </ExpandCollapse>
    {/if}
    <ExpandCollapse isExpanded={!isCollapsed} duration={400}>
      {#if isCreating}
        {@const team = teams.get(issue.space)}
        {@const statuses = issueStatuses.get(issue.space)}
        {#if team !== undefined && statuses !== undefined}
          <div class="pt-4" bind:this={subIssueEditorRef}>
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
