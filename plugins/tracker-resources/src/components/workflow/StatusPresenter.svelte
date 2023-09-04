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
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import { Icon, IconCircles, IconDelete, IconEdit, Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssueStatusIcon from '../issues/IssueStatusIcon.svelte'

  export let value: IssueStatus
  export let space: Ref<Project>
  export let isDefault = false
  export let isSingle = true

  const dispatch = createEventDispatcher()

  function edit () {
    dispatch('edit', value)
  }
</script>

<div class="flex-between border-radius-1 px-6 h-8 status-container" on:dblclick|preventDefault={edit}>
  <div class="flex-row-center flex-grow">
    <div class="draggable-mark" class:draggable={!isSingle}>
      <IconCircles size={'small'} />
    </div>
    <div class="flex-no-shrink">
      <IssueStatusIcon {value} size="small" {space} />
    </div>
    <span class="caption-color ml-2">{value.name}</span>
    {#if value.description}
      <span>&nbsp;·&nbsp;{value.description}</span>
    {/if}
  </div>
  <div class="buttons-group flex-no-shrink">
    {#if isDefault}
      <Label label={tracker.string.Default} />
    {:else if value.category === tracker.issueStatusCategory.Backlog || value.category === tracker.issueStatusCategory.Unstarted}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="btn" on:click|preventDefault={() => dispatch('default-update', value._id)}>
        <Label label={tracker.string.MakeDefault} />
      </div>
    {/if}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="btn"
      use:tooltip={{ label: tracker.string.EditWorkflowStatus, direction: 'bottom' }}
      on:click|preventDefault={edit}
    >
      <Icon icon={IconEdit} size={'small'} />
    </div>
    {#if !isDefault}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="btn"
        use:tooltip={{ label: tracker.string.DeleteWorkflowStatus, direction: 'bottom' }}
        on:click|preventDefault={() => dispatch('delete', value)}
      >
        <Icon icon={IconDelete} size={'small'} />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .status-container {
    background-color: var(--theme-button-default);

    .draggable-mark {
      position: absolute;
      top: 0.5rem;
      left: 0.125rem;
      width: 1rem;
      height: 1rem;
      opacity: 0;

      &.draggable {
        transition: opacity 0.15s;

        &::before {
          position: absolute;
          content: '';
          inset: -0.5rem;
        }
      }
    }
    .btn {
      position: relative;
      color: var(--theme-dark-color);
      transition: color 0.15s;
      transition: opacity 0.15s;
      opacity: 0;
      cursor: pointer;

      &:hover {
        color: var(--theme-content-color);
      }

      &::before {
        position: absolute;
        content: '';
        inset: -0.5rem;
      }
    }

    &:hover,
    &:active {
      .btn {
        opacity: 1;
      }
      .draggable-mark.draggable {
        opacity: 0.4;
        cursor: grab;
      }
    }
    &:hover {
      background-color: var(--theme-button-hovered);
    }
    &:active {
      background-color: var(--theme-button-pressed);
    }
  }
</style>
