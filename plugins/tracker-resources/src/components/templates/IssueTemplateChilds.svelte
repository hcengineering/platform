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
  import { IssueTemplateChild, Project, Sprint } from '@hcengineering/tracker'
  import { Button, closeTooltip, ExpandCollapse, IconAdd } from '@hcengineering/ui'
  import { afterUpdate } from 'svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import Collapsed from '../icons/Collapsed.svelte'
  import Expanded from '../icons/Expanded.svelte'
  import IssueTemplateChildEditor from './IssueTemplateChildEditor.svelte'
  import IssueTemplateChildList from './IssueTemplateChildList.svelte'

  export let children: IssueTemplateChild[] = []
  export let teamId: string = 'TSK'
  export let sprint: Ref<Sprint> | null = null
  export let project: Ref<Project> | null = null
  export let isScrollable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined

  const dispatch = createEventDispatcher()

  let isCollapsed = false
  let isCreating = false

  async function handleIssueSwap (ev: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    if (children) {
      const { fromIndex, toIndex } = ev.detail
      const [fromIssue] = children.splice(fromIndex, 1)
      const leftPart = children.slice(0, toIndex)
      const rightPart = children.slice(toIndex)
      children = [...leftPart, fromIssue, ...rightPart]
      dispatch('update-issues', children)
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
      kind="transparent"
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
{#if hasSubIssues}
  <ExpandCollapse isExpanded={!isCollapsed} duration={400} on:changeContent>
    <div class="flex-col flex-no-shrink list clear-mins" class:collapsed={isCollapsed}>
      <IssueTemplateChildList
        {project}
        {sprint}
        bind:issues={children}
        {teamId}
        on:move={handleIssueSwap}
        on:update-issue
      />
    </div>
  </ExpandCollapse>
{/if}
{#if isCreating}
  <ExpandCollapse isExpanded={!isCollapsed} duration={400} on:changeContent>
    <IssueTemplateChildEditor
      {project}
      {sprint}
      {isScrollable}
      {maxHeight}
      on:close={() => {
        isCreating = false
      }}
      on:create={(evt) => {
        if (children === undefined) {
          children = []
        }
        children = [...children, evt.detail]
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
