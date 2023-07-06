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
  import { Ref, toIdMap } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, Project, trackerId } from '@hcengineering/tracker'
  import {
    Button,
    Chevron,
    ExpandCollapse,
    IconAdd,
    IconScaleFull,
    Label,
    closeTooltip,
    getCurrentResolvedLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    ViewletSettingButton,
    createFilter,
    getViewOptions,
    setFilters,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import SubIssueList from './SubIssueList.svelte'
  import { afterUpdate } from 'svelte'
  import CreateIssue from '../../CreateIssue.svelte'

  export let issue: Issue
  export let projects: Map<Ref<Project>, Project>
  export let shouldSaveDraft: boolean = false

  let isCollapsed = false
  let listWidth: number

  $: hasSubIssues = issue.subIssues > 0

  let viewlet: Viewlet | undefined

  const query = createQuery()
  $: query.query(view.class.Viewlet, { _id: tracker.viewlet.SubIssues }, (res) => {
    ;[viewlet] = res
  })

  let _projects = projects

  const projectsQuery = createQuery()

  function openNewIssueDialog (): void {
    showPopup(tracker.component.CreateIssue, { space: issue.space, parentIssue: issue, shouldSaveDraft }, 'top')
  }

  $: if (projects === undefined) {
    projectsQuery.query(tracker.class.Project, {}, async (result) => {
      _projects = toIdMap(result)
    })
  } else {
    projectsQuery.unsubscribe()
  }

  $: viewOptions = viewlet !== undefined ? getViewOptions(viewlet, $viewOptionStore) : undefined

  export let focusIndex = -1

  let lastIssueId: Ref<Issue>
  afterUpdate(() => {
    if (lastIssueId !== issue._id) {
      lastIssueId = issue._id
    }
  })
</script>

<div class="flex-between mb-1">
  {#if hasSubIssues}
    <Button
      width="min-content"
      kind="ghost"
      on:click={() => {
        isCollapsed = !isCollapsed
      }}
    >
      <svelte:fragment slot="content">
        <Chevron size={'small'} expanded={!isCollapsed} outline fill={'var(--caption-color)'} marginRight={'.375rem'} />
        <Label label={tracker.string.SubIssuesList} params={{ subIssues: issue.subIssues }} />
      </svelte:fragment>
    </Button>
  {/if}
  <div class="flex-row-center gap-2">
    {#if viewlet && hasSubIssues && viewOptions}
      <ViewletSettingButton bind:viewOptions {viewlet} kind={'ghost'} />
    {/if}
    {#if hasSubIssues}
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
    <Button
      id="add-sub-issue"
      icon={hasSubIssues ? IconAdd : undefined}
      label={hasSubIssues ? undefined : tracker.string.AddSubIssues}
      labelParams={{ subIssues: 0 }}
      kind={'ghost'}
      showTooltip={{ label: tracker.string.AddSubIssues, props: { subIssues: 1 }, direction: 'bottom' }}
      on:click={() => {
        isCollapsed = false
        closeTooltip()
        openNewIssueDialog()
      }}
    />
  </div>
</div>
{#if hasSubIssues && viewOptions && viewlet}
  {#if !isCollapsed}
    <ExpandCollapse isExpanded={!isCollapsed}>
      <div class="list" class:collapsed={isCollapsed} bind:clientWidth={listWidth}>
        <SubIssueList
          createItemDialog={CreateIssue}
          createItemLabel={tracker.string.AddIssueTooltip}
          createItemDialogProps={{ space: issue.space, parentIssue: issue, shouldSaveDraft }}
          focusIndex={focusIndex === -1 ? -1 : focusIndex + 1}
          projects={_projects}
          {viewlet}
          {viewOptions}
          query={{ attachedTo: issue._id }}
          compactMode={listWidth <= 600}
        />
      </div>
    </ExpandCollapse>
  {/if}
{/if}

<style lang="scss">
  .list {
    padding-top: 0.75rem;
    border-top: 1px solid var(--divider-color);

    &.collapsed {
      padding-top: 1px;
      border-top: none;
    }
  }
</style>
