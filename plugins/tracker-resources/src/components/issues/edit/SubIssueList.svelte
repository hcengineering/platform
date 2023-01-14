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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { getEventPositionElement, showPanel, showPopup } from '@hcengineering/ui'
  import { ActionContext, ContextMenu, FixedColumn } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'
  import { getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import { subIssueListProvider } from '../../../utils'
  import Circles from '../../icons/Circles.svelte'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import DueDateEditor from '../DueDateEditor.svelte'
  import PriorityEditor from '../PriorityEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import EstimationEditor from '../timereport/EstimationEditor.svelte'
  import SubIssuesSelector from './SubIssuesSelector.svelte'

  export let issues: Issue[]

  export let teams: Map<Ref<Team>, Team>
  export let issueStatuses: Map<Ref<Team>, WithLookup<IssueStatus>[]>

  const dispatch = createEventDispatcher()

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null

  function openIssue (target: Issue) {
    dispatch('issue-focus', target)
    subIssueListProvider(issues, target._id)
    showPanel(tracker.component.EditIssue, target._id, target._class, 'content')
  }

  function resetDrag () {
    draggingIndex = null
    hoveringIndex = null
  }

  function handleDragStart (ev: DragEvent, index: number) {
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
      draggingIndex = index
    }
  }

  function handleDrop (ev: DragEvent, toIndex: number) {
    if (ev.dataTransfer && draggingIndex !== null && toIndex !== draggingIndex) {
      ev.dataTransfer.dropEffect = 'move'

      dispatch('move', { fromIndex: draggingIndex, toIndex })
    }

    resetDrag()
  }

  function showContextMenu (ev: MouseEvent, object: Issue) {
    showPopup(ContextMenu, { object }, getEventPositionElement(ev))
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

{#each issues as issue, index (issue._id)}
  {@const currentTeam = teams.get(issue.space)}
  {@const openIssueCall = () => openIssue(issue)}
  <div
    class="flex-between row"
    class:is-dragging={index === draggingIndex}
    class:is-dragged-over-up={draggingIndex !== null && index < draggingIndex && index === hoveringIndex}
    class:is-dragged-over-down={draggingIndex !== null && index > draggingIndex && index === hoveringIndex}
    animate:flip={{ duration: 400 }}
    draggable={true}
    on:click|self={openIssueCall}
    on:contextmenu|preventDefault={(ev) => showContextMenu(ev, issue)}
    on:dragstart={(ev) => handleDragStart(ev, index)}
    on:dragover|preventDefault={() => false}
    on:dragenter={() => (hoveringIndex = index)}
    on:drop|preventDefault={(ev) => handleDrop(ev, index)}
    on:dragend={resetDrag}
  >
    <div class="draggable-container">
      <div class="draggable-mark"><Circles /></div>
    </div>
    <div class="flex-row-center ml-6 clear-mins gap-2">
      <PriorityEditor value={issue} isEditable kind={'list'} size={'small'} justify={'center'} />
      <span class="issuePresenter" on:click={openIssueCall}>
        <FixedColumn key={'subissue_issue'} justify={'left'}>
          {#if currentTeam}
            {getIssueId(currentTeam, issue)}
          {/if}
        </FixedColumn>
      </span>
      <StatusEditor
        value={issue}
        statuses={issueStatuses.get(issue.space)}
        justify="center"
        kind={'list'}
        size={'small'}
        tooltipAlignment="bottom"
      />
      <span class="text name" title={issue.title} on:click={openIssueCall}>
        {issue.title}
      </span>
      {#if issue.subIssues > 0}
        <SubIssuesSelector value={issue} {currentTeam} />
      {/if}
    </div>
    <div class="flex-center flex-no-shrink">
      <EstimationEditor value={issue} kind={'list'} />
      {#if issue.dueDate !== null}
        <DueDateEditor value={issue} />
      {/if}
      <AssigneeEditor value={issue} />
    </div>
  </div>
{/each}

<style lang="scss">
  .row {
    position: relative;
    border-bottom: 1px solid var(--divider-color);

    .text {
      font-weight: 500;
      color: var(--caption-color);
    }

    .issuePresenter {
      flex-shrink: 0;
      min-width: 0;
      min-height: 0;
      font-weight: 500;
      color: var(--content-color);
      cursor: pointer;

      &:hover {
        color: var(--caption-color);
        text-decoration: underline;
      }
      &:active {
        color: var(--accent-color);
      }
    }

    .name {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .draggable-container {
      position: absolute;
      display: flex;
      align-items: center;
      height: 100%;
      width: 1.5rem;
      cursor: grabbing;

      .draggable-mark {
        opacity: 0;
        width: 0.375rem;
        height: 1rem;
        margin-left: 0.75rem;
        transition: opacity 0.1s;
      }
    }

    &:hover {
      .draggable-mark {
        opacity: 0.4;
      }
    }

    &.is-dragging::before {
      position: absolute;
      content: '';
      background-color: var(--theme-bg-color);
      opacity: 0.4;
      inset: 0;
    }

    &.is-dragged-over-up::before {
      position: absolute;
      content: '';
      inset: 0;
      border-top: 1px solid var(--theme-bg-check);
    }
    &.is-dragged-over-down::before {
      position: absolute;
      content: '';
      inset: 0;
      border-bottom: 1px solid var(--theme-bg-check);
    }
  }
</style>
