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
  import { IssueStatus } from '@hcengineering/tracker'
  import { Icon, IconCircles, IconClose, IconEdit, Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssueStatusIcon from '../issues/IssueStatusIcon.svelte'

  export let value: IssueStatus
  export let isDefault = false
  export let isSingle = true

  const dispatch = createEventDispatcher()

  function edit () {
    dispatch('edit', value)
  }
</script>

<div class="flex-between background-button-bg-color border-radius-1 p-2 root" on:dblclick|preventDefault={edit}>
  <div class="flex flex-grow items-center">
    <div class="flex-no-shrink draggable-mark" class:draggable={!isSingle}>
      <IconCircles />
    </div>
    <div class="flex-no-shrink ml-2">
      <IssueStatusIcon {value} size="small" />
    </div>
    <span class="caption-color ml-2">{value.name}</span>
    {#if value.description}
      <span>&nbsp;·&nbsp;{value.description}</span>
    {/if}
  </div>
  <div class="buttons-group flex-no-shrink mr-1">
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
      <Icon icon={IconEdit} size="small" />
    </div>
    {#if !isDefault}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="btn"
        use:tooltip={{ label: tracker.string.DeleteWorkflowStatus, direction: 'bottom' }}
        on:click|preventDefault={() => dispatch('delete', value)}
      >
        <Icon icon={IconClose} size="small" />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .root {
    &:hover {
      .btn {
        opacity: 1;
      }

      .draggable-mark.draggable {
        cursor: grab;
        opacity: 0.4;
      }
    }
  }

  .btn {
    position: relative;
    opacity: 0;
    cursor: pointer;
    color: var(--content-color);
    transition: color 0.15s;
    transition: opacity 0.15s;

    &:hover {
      color: var(--caption-color);
    }

    &::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }

  .draggable-mark {
    opacity: 0;
    position: relative;
    width: 0.375rem;
    height: 1rem;
    margin-left: 0.25rem;

    &.draggable {
      transition: opacity 0.15s;

      &::before {
        position: absolute;
        content: '';
        inset: -0.5rem;
      }
    }
  }
</style>
