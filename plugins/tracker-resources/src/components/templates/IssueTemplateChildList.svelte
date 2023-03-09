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
  import { createQuery } from '@hcengineering/presentation'
  import tracker, { IssueTemplateChild, Project, Sprint, Team } from '@hcengineering/tracker'
  import { eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { ActionContext, FixedColumn } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'
  import Circles from '../icons/Circles.svelte'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import EstimationEditor from './EstimationEditor.svelte'
  import IssueTemplateChildEditor from './IssueTemplateChildEditor.svelte'

  export let issues: IssueTemplateChild[]
  export let team: Ref<Team>
  export let sprint: Ref<Sprint> | null = null
  export let project: Ref<Project> | null = null

  const dispatch = createEventDispatcher()

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null

  function openIssue (evt: MouseEvent, target: IssueTemplateChild) {
    showPopup(
      IssueTemplateChildEditor,
      {
        showBorder: true,
        sprint,
        project,
        childIssue: target
      },
      eventToHTMLElement(evt),
      (evt: IssueTemplateChild | undefined | null) => {
        if (evt != null) {
          const pos = issues.findIndex((it) => it.id === evt.id)
          if (pos !== -1) {
            issues[pos] = evt
            dispatch('update-issue', evt)
          }
        }
      }
    )
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

  const teamQuery = createQuery()
  $: teamQuery.query(
    tracker.class.Team,
    {
      _id: team
    },
    (res) => ([currentTeam] = res)
  )
  let currentTeam: Team | undefined = undefined

  function getIssueTemplateId (currentTeam: Team | undefined, issue: IssueTemplateChild): string {
    return currentTeam
      ? `${currentTeam.identifier}-${issues.findIndex((it) => it.id === issue.id)}`
      : `${issues.findIndex((it) => it.id === issue.id)}}`
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

{#each issues as issue, index (issue.id)}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="flex-between row"
    class:is-dragging={index === draggingIndex}
    class:is-dragged-over-up={draggingIndex !== null && index < draggingIndex && index === hoveringIndex}
    class:is-dragged-over-down={draggingIndex !== null && index > draggingIndex && index === hoveringIndex}
    animate:flip={{ duration: 400 }}
    draggable={true}
    on:click|self={(evt) => openIssue(evt, issue)}
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
      <PriorityEditor
        value={issue}
        isEditable
        kind={'list'}
        size={'small'}
        justify={'center'}
        on:change={(evt) => {
          dispatch('update-issue', { id: issue.id, priority: evt.detail })
          issue.priority = evt.detail
        }}
      />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span class="issuePresenter" on:click={(evt) => openIssue(evt, issue)}>
        <FixedColumn key={'issue_template_issue'} justify={'left'}>
          {getIssueTemplateId(currentTeam, issue)}
        </FixedColumn>
      </span>
      <span class="text name" title={issue.title} on:click={(evt) => openIssue(evt, issue)}>
        {issue.title}
      </span>
    </div>
    <div class="flex-center flex-no-shrink">
      <EstimationEditor
        kind={'link'}
        size={'large'}
        bind:value={issue}
        on:change={(evt) => {
          dispatch('update-issue', { id: issue.id, estimation: evt.detail })
          issue.estimation = evt.detail
        }}
      />
      <AssigneeEditor
        value={issue}
        on:change={(evt) => {
          dispatch('update-issue', { id: issue.id, assignee: evt.detail })
          issue.assignee = evt.detail
        }}
      />
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
      background-color: var(--divider-color);
      inset: 0;
      z-index: -1;
    }

    &.is-dragged-over-up::before {
      position: absolute;
      content: '';
      inset: 0;
      border-top: 1px solid var(--caret-color);
    }
    &.is-dragged-over-down::before {
      position: absolute;
      content: '';
      inset: 0;
      border-bottom: 1px solid var(--caret-color);
    }
  }
</style>
