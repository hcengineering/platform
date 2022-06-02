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
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'
  import { WithLookup } from '@anticrm/core'
  import { Issue, IssueStatus } from '@anticrm/tracker'
  import { showPanel } from '@anticrm/ui'
  import tracker from '../../../plugin'
  import ProjectEditor from '../../projects/ProjectEditor.svelte'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import DueDateEditor from '../DueDateEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import Circles from '../../icons/Circles.svelte'

  export let issues: Issue[]
  export let issueStatuses: WithLookup<IssueStatus>[]

  const dispatch = createEventDispatcher()
  const animationConfig = {
    // We need this short delay to avoid animation flickering when
    // we receive a server response with updated array during the swap
    delay: 100,
    duration: 400
  }

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null

  function openIssue (target: Issue) {
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

  function handleDrop (ev: DragEvent, newIndex: number) {
    if (ev.dataTransfer && draggingIndex !== null && newIndex !== draggingIndex) {
      ev.dataTransfer.dropEffect = 'move'

      if (draggingIndex < newIndex) {
        issues.splice(newIndex + 1, 0, issues[draggingIndex])
        issues.splice(draggingIndex, 1)
      } else {
        issues.splice(newIndex, 0, issues[draggingIndex])
        issues.splice(draggingIndex + 1, 1)
      }

      dispatch('move', newIndex)
    }

    resetDrag()
  }
</script>

{#each issues as issue, index (issue._id)}
  <div
    class="flex-between row"
    class:is-dragging={index === draggingIndex}
    class:is-dragged-over={index === hoveringIndex}
    animate:flip={animationConfig}
    draggable={true}
    on:click|self={() => openIssue(issue)}
    on:dragstart={(ev) => handleDragStart(ev, index)}
    on:dragover|preventDefault={() => false}
    on:dragenter={() => (hoveringIndex = index)}
    on:drop|preventDefault={(ev) => handleDrop(ev, index)}
    on:dragend={resetDrag}
  >
    <div class="draggable-container">
      <div class="draggable-mark"><Circles /></div>
    </div>
    <div class="flex-center ml-6">
      <StatusEditor value={issue} statuses={issueStatuses} kind="transparent" tooltipAlignment="bottom" />
      <span class="flex-no-shrink name" on:click={() => openIssue(issue)}>
        {issue.title}
      </span>
    </div>
    <div class="flex-center">
      <ProjectEditor value={issue} />
      <DueDateEditor value={issue} />
      <AssigneeEditor value={issue} />
    </div>
  </div>
{/each}

<style lang="scss">
  .row {
    position: relative;
    border-bottom: 1px solid var(--divider-color);

    .name {
      font-weight: 500;
      color: var(--theme-caption-color);
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

    &.is-dragging {
      &::before {
        position: absolute;
        content: '';
        color: var(--theme-bg-color);
        opacity: 0.4;
        inset: 0;
      }
    }

    &.is-dragged-over {
      border-bottom: 1px solid var(--theme-bg-check);
    }
  }
</style>
