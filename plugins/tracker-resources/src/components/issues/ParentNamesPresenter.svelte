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
  import type { Issue, IssueParentInfo } from '@hcengineering/tracker'
  import { showPanel } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: Issue | undefined

  export let maxWidth = ''

  function handleIssueEditorOpened (parent: IssueParentInfo) {
    if (value === undefined) return
    showPanel(tracker.component.EditIssue, parent.parentId, value._class, 'content')
  }
</script>

{#if value}
  <div class="root" style:max-width={maxWidth}>
    <span class="names">
      {#each value.parents as parentInfo}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span
          class="parent-label overflow-label cursor-pointer"
          title={parentInfo.parentTitle}
          on:click={() => handleIssueEditorOpened(parentInfo)}
        >
          {parentInfo.parentTitle}
        </span>
      {/each}
    </span>
  </div>
{/if}

<style lang="scss">
  .root {
    display: inline-flex;
    margin-left: 0;
    min-width: 0;

    .names {
      display: inline-flex;
      min-width: 0;
      color: var(--theme-dark-color);
    }

    .parent-label {
      flex-shrink: 5;

      &:hover {
        color: var(--theme-caption-color);
        text-decoration: underline;
      }
      &:active {
        color: var(--theme-content-color);
      }
      &::before {
        content: '›';
        padding: 0 0.25rem;
      }
    }
  }
</style>
