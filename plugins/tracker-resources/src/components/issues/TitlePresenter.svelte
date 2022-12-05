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
  import type { Issue } from '@hcengineering/tracker'
  import ParentNamesPresenter from './ParentNamesPresenter.svelte'
  import tracker from '../../plugin'
  import { showPanel } from '@hcengineering/ui'

  export let value: Issue
  export let shouldUseMargin: boolean = false

  function handleIssueEditorOpened () {
    showPanel(tracker.component.EditIssue, value._id, value._class, 'content')
  }
</script>

{#if value}
  <span class="titlePresenter-container" class:with-margin={shouldUseMargin} title={value.title}>
    <span
      class="name overflow-label cursor-pointer"
      style={`max-width: ${value.parents.length !== 0 ? 95 : 100}%`}
      on:click={handleIssueEditorOpened}>{value.title}</span
    >
    <ParentNamesPresenter {value} />
  </span>
{/if}

<style lang="scss">
  .titlePresenter-container {
    display: flex;
    flex-grow: 0;
    min-width: 1.5rem;
    // flex-shrink: 10;

    .name {
      flex-shrink: 0;
      &:hover {
        text-decoration: underline;
      }

      &:active {
        color: var(--accent-color);
      }
    }

    &.with-margin {
      margin-left: 0.5rem;
    }
  }
</style>
