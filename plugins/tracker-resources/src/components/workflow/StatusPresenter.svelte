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
  import { Asset } from '@anticrm/platform'
  import { IssueStatus } from '@anticrm/tracker'
  import { Icon, Label, IconEdit, IconClose, tooltip } from '@anticrm/ui'
  import tracker from '../../plugin'

  export let value: IssueStatus
  export let icon: Asset
  export let isDefault = false
  export let canDelete = false

  const dispatch = createEventDispatcher()
</script>

<div class="flex-between background-button-bg-color border-radius-1 p-2 root">
  <div class="flex flex-grow items-center">
    <Icon {icon} size="small" fill="red" />
    <span class="content-accent-color ml-2">{value.name}</span>
    {#if value.description}
      <span>&nbsp;·&nbsp;{value.description}</span>
    {/if}
  </div>
  <div class="buttons-group flex-no-shrink mr-1">
    {#if isDefault}
      <Label label={tracker.string.Default} />
    {:else if value.category === tracker.issueStatusCategory.Backlog || value.category === tracker.issueStatusCategory.Unstarted}
      <div class="btn" on:click|preventDefault={() => dispatch('default-update', value._id)}>
        <Label label={tracker.string.MakeDefault} />
      </div>
    {/if}
    <div
      class="btn"
      use:tooltip={{ label: tracker.string.EditWorkflowStatus, direction: 'bottom' }}
      on:click|preventDefault={() => dispatch('edit', value)}
    >
      <Icon icon={IconEdit} size="small" />
    </div>
    {#if canDelete}
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
        visibility: visible;
      }
    }
  }

  .btn {
    position: relative;
    visibility: hidden;
    cursor: pointer;
    color: var(--content-color);
    transition: color 0.15s;

    &:hover {
      color: var(--caption-color);
    }

    &::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }
</style>
