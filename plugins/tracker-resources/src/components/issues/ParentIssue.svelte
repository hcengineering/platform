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
  import { Issue } from '@hcengineering/tracker'
  import { Button, IconClose } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import PriorityRefPresenter from './PriorityRefPresenter.svelte'

  export let issue: Issue

  const dispatch = createEventDispatcher()
</script>

<div class="parentIssue-container">
  <div class="flex-no-shrink mr-1-5">
    <PriorityRefPresenter value={issue.priority} shouldShowLabel={false} />
  </div>
  <span class="overflow-label flex-no-shrink content-dark-color">{issue.identifier}</span>
  <span class="overflow-label issue-title">{issue.title}</span>
  <Button
    icon={IconClose}
    showTooltip={{ label: tracker.string.RemoveParent, direction: 'bottom' }}
    kind={'ghost'}
    size={'small'}
    on:click={() => dispatch('close')}
  />
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
</style>
