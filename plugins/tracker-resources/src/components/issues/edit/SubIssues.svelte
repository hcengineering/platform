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
  import { createQuery, draftsStore } from '@hcengineering/presentation'
  import { Issue, Project, trackerId } from '@hcengineering/tracker'
  import {
    Button,
    Chevron,
    ExpandCollapse,
    IconAdd,
    IconArrowRight,
    IconScaleFull,
    Label,
    closeTooltip,
    getCurrentResolvedLocation,
    navigate
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
  import CreateSubIssue from './CreateSubIssue.svelte'
  import SubIssueList from './SubIssueList.svelte'

  export let issue: Issue
  export let projects: Map<Ref<Project>, Project>
  export let shouldSaveDraft: boolean = false

  let subIssueEditorRef: HTMLDivElement
  let isCollapsed = false
  let isCreating = $draftsStore[issue._id] !== undefined

  $: hasSubIssues = issue.subIssues > 0

  let viewlet: Viewlet | undefined

  const query = createQuery()
  $: query.query(view.class.Viewlet, { _id: tracker.viewlet.SubIssues }, (res) => {
    ;[viewlet] = res
  })

  let _projects = projects

  const projectsQuery = createQuery()

  $: if (projects === undefined) {
    projectsQuery.query(tracker.class.Project, {}, async (result) => {
      _projects = toIdMap(result)
    })
  } else {
    projectsQuery.unsubscribe()
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
  {#if hasSubIssues && viewOptions && viewlet}
    {#if !isCollapsed}
      <ExpandCollapse isExpanded={!isCollapsed}>
        <div class="list" class:collapsed={isCollapsed}>
          <SubIssueList projects={_projects} {viewlet} {viewOptions} query={{ attachedTo: issue._id }} />
        </div>
      </ExpandCollapse>
    {/if}
  {/if}
  <ExpandCollapse isExpanded={!isCollapsed}>
    {#if isCreating}
      {@const project = projects.get(issue.space)}
      {#if project !== undefined}
        <div class="pt-4" bind:this={subIssueEditorRef}>
          <CreateSubIssue
            parentIssue={issue}
            {shouldSaveDraft}
            currentProject={project}
            on:close={() => (isCreating = false)}
          />
        </div>
      {/if}
    {/if}
  </ExpandCollapse>
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
