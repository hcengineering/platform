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
  import { Component, Issue, IssueTemplateChild, Project, Milestone } from '@hcengineering/tracker'
  import { Button, ExpandCollapse, IconAdd, Scroller, closeTooltip } from '@hcengineering/ui'
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import Collapsed from '../icons/Collapsed.svelte'
  import Expanded from '../icons/Expanded.svelte'
  import IssueTemplateChildEditor from './IssueTemplateChildEditor.svelte'
  import IssueTemplateChildList from './IssueTemplateChildList.svelte'

  export let children: IssueTemplateChild[] = []
  export let project: Ref<Project>
  export let milestone: Ref<Milestone> | null = null
  export let component: Ref<Component> | null = null
  export let isScrollable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined

  const dispatch = createEventDispatcher()

  let isCollapsed = false
  let isCreating = false

  function handleIssueSwap (ev: CustomEvent<{ id: Ref<Issue>; toIndex: number }>) {
    if (children) {
      const { id, toIndex } = ev.detail
      const index = children.findIndex((p) => p.id === id)
      if (index !== -1 && index !== toIndex) {
        const [fromIssue] = children.splice(index, 1)
        const leftPart = children.slice(0, toIndex)
        const rightPart = children.slice(toIndex)
        children = [...leftPart, fromIssue, ...rightPart]
        dispatch('update-issues', children)
      }
    }
  }

  afterUpdate(() => dispatch('changeContent'))

  $: hasSubIssues = children.length > 0
</script>

<div class="flex-between clear-mins">
  {#if hasSubIssues}
    <Button
      width="min-content"
      icon={isCollapsed ? Collapsed : Expanded}
      size="small"
      kind="ghost"
      label={tracker.string.SubIssuesList}
      labelParams={{ subIssues: children.length }}
      on:click={() => {
        isCollapsed = !isCollapsed
        isCreating = false
      }}
    />
  {/if}

  <Button
    id="add-sub-issue"
    width="min-content"
    icon={hasSubIssues ? IconAdd : undefined}
    label={hasSubIssues ? undefined : tracker.string.AddSubIssues}
    kind={'ghost'}
    size={'small'}
    showTooltip={{ label: tracker.string.AddSubIssues }}
    on:click={() => {
      closeTooltip()
      isCreating = true
      isCollapsed = false
    }}
  />
</div>
{#if hasSubIssues}
  <ExpandCollapse isExpanded={!isCollapsed} on:changeContent>
    <div class="flex-col flex-no-shrink max-h-30 list clear-mins" class:collapsed={isCollapsed}>
      <Scroller>
        <IssueTemplateChildList
          {component}
          {milestone}
          bind:issues={children}
          {project}
          on:move={handleIssueSwap}
          on:update-issue
        />
      </Scroller>
    </div>
  </ExpandCollapse>
{/if}
{#if isCreating}
  <ExpandCollapse isExpanded={!isCollapsed} on:changeContent>
    <IssueTemplateChildEditor
      projectId={project}
      {component}
      {milestone}
      {isScrollable}
      {maxHeight}
      on:close={() => {
        isCreating = false
      }}
      on:create={(evt) => {
        if (children === undefined) {
          children = []
        }
        dispatch('create-issue', evt.detail)
      }}
      on:changeContent
    />
  </ExpandCollapse>
{/if}

<style lang="scss">
  .list {
    border-top: 1px solid var(--divider-color);

    &.collapsed {
      padding-top: 1px;
      border-top: none;
    }
  }
</style>
