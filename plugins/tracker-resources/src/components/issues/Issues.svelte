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
  import { DocumentQuery, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, IssueStatus, IssueStatusCategory, Team } from '@anticrm/tracker'
  import { Label, ScrollBox } from '@anticrm/ui'
  import CategoryPresenter from './CategoryPresenter.svelte'
  import tracker from '../../plugin'

  export let currentSpace: Ref<Team>
  export let statusCategories: Ref<IssueStatusCategory>[] | undefined = undefined
  export let title: IntlString = tracker.string.AllIssues
  export let query: DocumentQuery<Issue> = {}
  export let search: string = ''

  const spaceQuery = createQuery()
  const categoriesQuery = createQuery()
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

  let categories: WithLookup<IssueStatus>[] = []
  let filteredCategories: WithLookup<IssueStatus>[] = []
  $: categoriesQuery.query(tracker.class.IssueStatus, { attachedTo: currentSpace }, (statuses) => {
    const issueStatusCats = statusCategories && new Set(statusCategories)
  
    categories = statuses
    filteredCategories = issueStatusCats
      ? statuses.filter((status) => issueStatusCats.has(status.category))
      : statuses
  }, {
    lookup: { category: tracker.class.IssueStatusCategory },
    sort: { rank: SortingOrder.Ascending }
  })
</script>

{#if currentTeam}
  <ScrollBox vertical stretch>
    <div class="fs-title">
      <Label label={title} params={{ value: getTotalIssues() }} />
    </div>

    <div class="mt-4">
      {#each filteredCategories as category}
        <CategoryPresenter
          categoryId={category._id}
          {categories}
          query={resultQuery}
          {currentSpace}
          {currentTeam}
          on:content={(event) => {
            issuesMap[category._id] = event.detail
          }}
        />
      {/each}
    </div>
  </ScrollBox>
{/if}
