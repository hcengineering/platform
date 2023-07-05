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
  import { Spinner, IconClose, Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { getIssueId } from '../../issues'
  import PriorityRefPresenter from './PriorityRefPresenter.svelte'

  export let issue: Issue

  const dispatch = createEventDispatcher()
  const spaceQuery = createQuery()

  let project: Project | undefined

  $: spaceQuery.query(tracker.class.Project, { _id: issue.space }, (res) => ([project] = res))
  $: issueId = project && getIssueId(project, issue)
</script>

<div class="parentIssue-container">
  <div class="flex-no-shrink mr-1-5">
    <PriorityRefPresenter value={issue.priority} shouldShowLabel={false} />
  </div>
  {#if issueId}
    <span class="overflow-label flex-no-shrink content-dark-color">{issueId}</span>
  {:else}
    <Spinner size="small" />
  {/if}
  <span class="overflow-label issue-title">{issue.title}</span>
  <Button
    icon={IconClose}
    showTooltip={{ label: tracker.string.RemoveParent, direction: 'bottom' }}
    kind={'ghost'}
    size={'small'}
    on:click={() => dispatch('close')}
  />
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- <div
    class="button-close"
    use:tooltip={{ label: tracker.string.RemoveParent, direction: 'bottom' }}
    on:click={() => dispatch('close')}
  >
    <IconClose size="x-small" />
  </div> -->
</div>

<style lang="scss">
  .parentIssue-container {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.25rem 0.25rem 0.75rem;
    max-width: fit-content;
    min-width: 0;
    // line-height: 150%;
    height: 2.25rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
  }

  .issue-title {
    margin: 0 0.25rem 0 0.375rem;
    padding-right: 0.75rem;
    min-width: 0;
    color: var(--theme-caption-color);
    border-right: 1px solid var(--theme-button-border);
  }

  .button-close {
    cursor: pointer;
    position: relative;
    color: var(--theme-dark-color);
    transition: color 0.15s;

    &:hover {
      color: var(--theme-content-color);
    }
    &:active {
      color: var(--theme-dark-color);
    }
    &::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }
</style>
