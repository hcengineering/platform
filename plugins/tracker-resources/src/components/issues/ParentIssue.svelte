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
  import { createQuery } from '@hcengineering/presentation'
  import { Project, Issue } from '@hcengineering/tracker'
  import { Spinner, IconClose, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { getIssueId } from '../../issues'

  export let issue: Issue

  const dispatch = createEventDispatcher()
  const spaceQuery = createQuery()

  let project: Project | undefined

  $: spaceQuery.query(tracker.class.Project, { _id: issue.space }, (res) => ([project] = res))
  $: issueId = project && getIssueId(project, issue)
</script>

<div class="flex-center root">
  {#if issueId}
    <span class="overflow-label flex-no-shrink">{issueId}</span>
  {:else}
    <Spinner size="small" />
  {/if}
  <span class="overflow-label issue-title">{issue.title}</span>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="button-close"
    use:tooltip={{ label: tracker.string.RemoveParent, direction: 'bottom' }}
    on:click={() => dispatch('close')}
  >
    <IconClose size="x-small" />
  </div>
</div>

<style lang="scss">
  .root {
    padding: 0.375rem 0.75rem;
    line-height: 150%;
    max-width: fit-content;
    border: 1px solid var(--button-border-color);
    border-radius: 0.25rem;
    box-shadow: var(--button-shadow);
  }

  .issue-title {
    margin: 0 0.75rem 0 0.5rem;
    padding-right: 0.75rem;
    color: var(--accent-color);
    border-right: 1px solid var(--button-border-color);
  }

  .button-close {
    cursor: pointer;
    position: relative;
    color: var(--content-color);
    transition: color 0.15s;

    &:hover {
      color: var(--caption-color);
    }
    &:active {
      color: var(--accent-color);
    }
    &::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }
</style>
