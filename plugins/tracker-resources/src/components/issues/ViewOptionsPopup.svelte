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
  import { IssuesGrouping, IssuesOrdering, IssuesDateModificationPeriod } from '@anticrm/tracker'
  import { Label, MiniToggle } from '@anticrm/ui'
  import tracker from '../../plugin'
  import { issuesGroupByOptions, issuesOrderByOptions, issuesDateModificationPeriodOptions } from '../../utils'
  import DropdownNative from '../DropdownNative.svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let groupBy: IssuesGrouping | undefined = undefined
  export let orderBy: IssuesOrdering | undefined = undefined
  export let completedIssuesPeriod: IssuesDateModificationPeriod | null = null
  export let shouldShowSubIssues: boolean | undefined = false
  export let shouldShowEmptyGroups: boolean | undefined = false

  const groupByItems = issuesGroupByOptions
  const orderByItems = issuesOrderByOptions
  const dateModificationPeriodItems = issuesDateModificationPeriodOptions

  $: dispatch('update', { groupBy, orderBy, completedIssuesPeriod, shouldShowSubIssues, shouldShowEmptyGroups })
</script>

<div class="root">
  <div class="groupContainer">
    <div class="viewOption">
      <div class="label">
        <Label label={tracker.string.Grouping} />
      </div>
      <div class="optionContainer">
        <DropdownNative items={groupByItems} bind:selected={groupBy} />
      </div>
    </div>
    <div class="viewOption">
      <div class="label">
        <Label label={tracker.string.Ordering} />
      </div>
      <div class="optionContainer">
        <DropdownNative items={orderByItems} bind:selected={orderBy} />
      </div>
    </div>
  </div>
  <div class="groupContainer">
    {#if completedIssuesPeriod}
      <div class="viewOption">
        <div class="label">
          <Label label={tracker.string.CompletedIssues} />
        </div>
        <div class="optionContainer">
          <DropdownNative items={dateModificationPeriodItems} bind:selected={completedIssuesPeriod} />
        </div>
      </div>
    {/if}
    <div class="viewOption">
      <div class="label">
        <Label label={tracker.string.SubIssues} />
      </div>
      <div class="optionContainer">
        <MiniToggle bind:on={shouldShowSubIssues} />
      </div>
    </div>    
    {#if groupBy === IssuesGrouping.Status || groupBy === IssuesGrouping.Priority}
      <div class="viewOption">
        <div class="label">
          <Label label={tracker.string.ShowEmptyGroups} />
        </div>
        <div class="optionContainer">
          <MiniToggle bind:on={shouldShowEmptyGroups} />
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    width: 17rem;
    background-color: var(--board-card-bg-color);
  }

  .groupContainer {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--popup-divider);
  }

  .viewOption {
    display: flex;
    min-height: 2rem;
  }

  .label {
    display: flex;
    align-items: center;
    min-width: 5rem;
    color: var(--theme-content-dark-color);
  }

  .optionContainer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-grow: 1;
  }
</style>
