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
  import { Label, MiniToggle, DropdownRecord } from '@anticrm/ui'
  import tracker from '../../plugin'
  import { issuesGroupByOptions, issuesOrderByOptions, issuesDateModificationPeriodOptions } from '../../utils'
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

  const updateOptions = (): void => {
    dispatch('update', { groupBy, orderBy, completedIssuesPeriod, shouldShowSubIssues, shouldShowEmptyGroups })
  }
</script>

<div class="antiCard">
  <div class="antiCard-group grid">
    <span class="label"><Label label={tracker.string.Grouping} /></span>
    <div class="value">
      <DropdownRecord
        items={groupByItems}
        selected={groupBy}
        on:select={result => {
          if (result === undefined) return
          groupBy = result.detail
          updateOptions()
        }}
      />
    </div>
    <span class="label"><Label label={tracker.string.Ordering} /></span>
    <div class="value">
      <DropdownRecord
        items={orderByItems}
        selected={orderBy}
        on:select={result => {
          if (result === undefined) return
          orderBy = result.detail
          updateOptions()
        }}
      />
    </div>
  </div>
  <div class="antiCard-group grid">
    {#if completedIssuesPeriod}
      <span class="label"><Label label={tracker.string.CompletedIssues} /></span>
      <div class="value">
        <DropdownRecord
          items={dateModificationPeriodItems}
          selected={completedIssuesPeriod}
          on:select={result => {
            if (result === undefined) return
            completedIssuesPeriod = result.detail
            updateOptions()
          }}
        />
      </div>
    {/if}
    <span class="label"><Label label={tracker.string.SubIssues} /></span>
    <div class="value">
      <MiniToggle
        bind:on={shouldShowSubIssues}
        on:change={updateOptions}
      />
    </div>
    {#if groupBy === IssuesGrouping.Status || groupBy === IssuesGrouping.Priority}
      <span class="label"><Label label={tracker.string.ShowEmptyGroups} /></span>
      <div class="value">
        <MiniToggle
          bind:on={shouldShowEmptyGroups}
          on:change={updateOptions}
        />
      </div>
    {/if}
  </div>
</div>
