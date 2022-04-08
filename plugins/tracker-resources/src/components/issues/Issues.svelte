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
  import type { DocumentQuery, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Label, ScrollBox } from '@anticrm/ui'
  import CategoryPresenter from './CategoryPresenter.svelte'
  import tracker from '../../plugin'
  import { IntlString } from '@anticrm/platform'

  export let currentSpace: Ref<Team>
  export let categories = [
    IssueStatus.InProgress,
    IssueStatus.Todo,
    IssueStatus.Backlog,
    IssueStatus.Done,
    IssueStatus.Canceled
  ]
  export let title: IntlString = tracker.string.AllIssues
  export let query: DocumentQuery<Issue> = {}
  export let search: string = ''

  const spaceQuery = createQuery()
  const issuesMap: { [status: string]: number } = {}

  $: getTotalIssues = () => {
    let total = 0

    for (const issuesAmount of Object.values(issuesMap)) {
      total += issuesAmount
    }

    return total
  }

  $: resultQuery =
    search === '' ? { space: currentSpace, ...query } : { $search: search, space: currentSpace, ...query }

  let currentTeam: Team | undefined

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })
</script>

{#if currentTeam}
  <ScrollBox vertical stretch>
    <div class="fs-title">
      <Label label={title} params={{ value: getTotalIssues() }} />
    </div>

    <div class="ml-4 mt-4">
      {#each categories as category}
        <CategoryPresenter
          {category}
          query={resultQuery}
          {currentSpace}
          {currentTeam}
          on:content={(event) => {
            issuesMap[category] = event.detail
          }}
        />
      {/each}
    </div>
  </ScrollBox>
{/if}
