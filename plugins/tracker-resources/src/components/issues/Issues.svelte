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
  import contact from '@anticrm/contact'
  import type { DocumentQuery, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Issue, Team, IssuesGrouping } from '@anticrm/tracker'
  import { Button, Label, ScrollBox, IconOptions, showPopup } from '@anticrm/ui'
  import CategoryPresenter from './CategoryPresenter.svelte'
  import tracker from '../../plugin'
  import { IntlString } from '@anticrm/platform'
  import ViewOptionsPopup from './ViewOptionsPopup.svelte'
  import { IssuesGroupByKeys, issuesGroupKeyMap } from '../../utils'

  export let currentSpace: Ref<Team>
  export let title: IntlString = tracker.string.AllIssues
  export let query: DocumentQuery<Issue> = {}
  export let search: string = ''
  export let groupingKey: IssuesGrouping = IssuesGrouping.Status
  export let includedGroups: Partial<Record<IssuesGroupByKeys, Array<any>>> = {}

  const ENTRIES_LIMIT = 200
  const spaceQuery = createQuery()
  const issuesQuery = createQuery()
  const issuesMap: { [status: string]: number } = {}
  let currentTeam: Team | undefined
  let issues: Issue[] = []

  $: totalIssues = getTotalIssues(issuesMap)

  $: resultQuery =
    search === ''
      ? { space: currentSpace, ...includedIssuesQuery, ...query }
      : { $search: search, space: currentSpace, ...includedIssuesQuery, ...query }

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  $: groupByKey = issuesGroupKeyMap[groupingKey]
  $: categories = getCategories(groupByKey, issues)
  $: displayedCategories = (categories as any[]).filter((x: ReturnType<typeof getCategories>) => {
    return (
      groupByKey === undefined || includedGroups[groupByKey] === undefined || includedGroups[groupByKey]?.includes(x)
    )
  })
  $: includedIssuesQuery = getIncludedIssues(includedGroups)
  
  const getIncludedIssues = (groups: Partial<Record<IssuesGroupByKeys, Array<any>>>) => {
    const resultMap: { [p: string]: { $in: any[] } } = {}

    for (const [key, value] of Object.entries(groups)) {
      resultMap[key] = { $in: value }
    }

    return resultMap
  }

  $: issuesQuery.query<Issue>(
    tracker.class.Issue,
    { ...includedIssuesQuery },
    (result) => {
      issues = result
    },
    { limit: ENTRIES_LIMIT, lookup: { assignee: contact.class.Employee } }
  )

  const getCategories = (key: IssuesGroupByKeys | undefined, elements: Issue[]) => {
    if (!key) {
      return [undefined]
    }

    return Array.from(
      new Set(
        elements.map((x) => {
          return x[key]
        })
      )
    )
  }

  const getTotalIssues = (map: { [status: string]: number }) => {
    let total = 0

    for (const amount of Object.values(map)) {
      total += amount
    }

    return total
  }

  const handleGroupingKeyUpdated = (result: any) => {
    if (result === undefined) {
      return
    }

    for (const prop of Object.getOwnPropertyNames(issuesMap)) {
      delete issuesMap[prop]
    }

    groupingKey = result
  }

  const handleOptionsEditorOpened = (event: Event) => {
    if (!currentSpace) {
      return
    }

    showPopup(ViewOptionsPopup, { groupBy: groupingKey }, event.target, undefined, handleGroupingKeyUpdated)
  }
</script>

{#if currentTeam}
  <ScrollBox vertical stretch>
    <div class="fs-title flex-between mt-1 mr-1 ml-1">
      <Label label={title} params={{ value: totalIssues }} />
      <Button icon={IconOptions} kind={'link'} on:click={handleOptionsEditorOpened} />
    </div>
    <div class="mt-4">
      {#each displayedCategories as category}
        <CategoryPresenter
          groupBy={{ key: groupByKey, group: category }}
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
