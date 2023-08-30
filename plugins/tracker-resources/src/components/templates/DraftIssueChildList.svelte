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
  import { createQuery, ActionContext } from '@hcengineering/presentation'
  import tracker, { Component, IssueDraft, Project, Milestone } from '@hcengineering/tracker'
  import { eventToHTMLElement, IconCircles, showPopup } from '@hcengineering/ui'
  import { FixedColumn } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import StatusEditor from '../issues/StatusEditor.svelte'
  import DraftIssueChildEditor from './DraftIssueChildEditor.svelte'
  import EstimationEditor from './EstimationEditor.svelte'

  export let issues: IssueDraft[]
  export let project: Ref<Project>
  export let milestone: Ref<Milestone> | null = null
  export let component: Ref<Component> | null = null
  const dispatch = createEventDispatcher()

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null

  function openIssue (evt: MouseEvent, target: IssueDraft) {
    showPopup(
      DraftIssueChildEditor,
      {
        showBorder: true,
        project: currentProject,
        milestone,
        component,
        childIssue: target
      },
      eventToHTMLElement(evt),
      (evt: IssueDraft | undefined | null) => {
        if (evt != null) {
          const pos = issues.findIndex((it) => it._id === evt._id)
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

  const projectQuery = createQuery()
  $: projectQuery.query(
    tracker.class.Project,
    {
      _id: project
    },
    (res) => ([currentProject] = res)
  )
  let currentProject: Project | undefined = undefined

  function getIssueTemplateId (currentProject: Project | undefined, issue: IssueDraft): string {
    return currentProject
      ? `${currentProject.identifier}-${issues.findIndex((it) => it._id === issue._id)}`
      : `${issues.findIndex((it) => it._id === issue._id)}}`
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

{#each issues as issue, index (issue._id)}
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
      <IconCircles size={'small'} />
    </div>
    <div class="flex-row-center ml-6 clear-mins gap-2">
      <StatusEditor
        value={{ ...issue, space: project }}
        kind="list"
        size="small"
        shouldShowLabel={true}
        on:change={({ detail }) => (issue.status = detail)}
      />
      <PriorityEditor
        value={issue}
        isEditable
        kind={'list'}
        size={'small'}
        justify={'center'}
        on:change={(evt) => {
          dispatch('update-issue', { id: issue._id, priority: evt.detail })
          issue.priority = evt.detail
        }}
      />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span class="issuePresenter" on:click={(evt) => openIssue(evt, issue)}>
        <FixedColumn key={'issue_template_issue'} justify={'left'}>
          {getIssueTemplateId(currentProject, issue)}
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
          dispatch('update-issue', { id: issue._id, estimation: evt.detail })
          issue.estimation = evt.detail
        }}
      />
      <AssigneeEditor
        object={issue}
        on:change={(evt) => {
          dispatch('update-issue', { id: issue._id, assignee: evt.detail })
          issue.assignee = evt.detail
        }}
      />
    </div>
  </div>
{/each}

<style lang="scss">
  .row {
    position: relative;
    border-bottom: 1px solid var(--theme-divider-color);

    .text {
      font-weight: 500;
      color: var(--theme-caption-color);
    }

    .issuePresenter {
      flex-shrink: 0;
      min-width: 0;
      min-height: 0;
      color: var(--theme-content-color);
      cursor: pointer;

      &:hover {
        color: var(--theme-caption-color);
        text-decoration: underline;
      }
      &:active {
        color: var(--theme-caption-color);
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
      top: 50%;
      left: 0.125rem;
      width: 1rem;
      height: 1rem;
      opacity: 0;
      transform: translateY(-50%);
      transition: opacity 0.1s;
      cursor: grabbing;
    }

    &:hover .draggable-container {
      opacity: 0.4;
    }

    &.is-dragging::before {
      position: absolute;
      content: '';
      background-color: var(--theme-divider-color);
      inset: 0;
      z-index: -1;
    }

    &.is-dragged-over-up::before {
      position: absolute;
      content: '';
      inset: 0;
      border-top: 1px solid var(--theme-caret-color);
    }
    &.is-dragged-over-down::before {
      position: absolute;
      content: '';
      inset: 0;
      border-bottom: 1px solid var(--theme-caret-color);
    }
  }
</style>
