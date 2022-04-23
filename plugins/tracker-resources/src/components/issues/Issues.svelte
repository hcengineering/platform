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
  import { DocumentQuery, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import {
    Issue,
    Team,
    IssuesGrouping,
    IssuesOrdering,
    IssuesDateModificationPeriod,
    IssueStatus
  } from '@anticrm/tracker'
  import { Button, Label, ScrollBox, IconOptions, showPopup, eventToHTMLElement } from '@anticrm/ui'
  import CategoryPresenter from './CategoryPresenter.svelte'
  import tracker from '../../plugin'
  import { IntlString } from '@anticrm/platform'
  import ViewOptionsPopup from './ViewOptionsPopup.svelte'
  import {
    IssuesGroupByKeys,
    issuesGroupKeyMap,
    issuesOrderKeyMap,
    defaultIssueCategories,
    getIssuesModificationDatePeriodTime
  } from '../../utils'

  export let currentSpace: Ref<Team>
  export let title: IntlString = tracker.string.AllIssues
  export let query: DocumentQuery<Issue> = {}
  export let search: string = ''
  export let groupingKey: IssuesGrouping = IssuesGrouping.Status
  export let orderingKey: IssuesOrdering = IssuesOrdering.LastUpdated
  export let completedIssuesPeriod: IssuesDateModificationPeriod | null = IssuesDateModificationPeriod.All
  export let shouldShowEmptyGroups: boolean | undefined = false
  export let includedGroups: Partial<Record<IssuesGroupByKeys, Array<any>>> = {}

  const ENTRIES_LIMIT = 200
  const spaceQuery = createQuery()
  const issuesQuery = createQuery()
  const statusesQuery = createQuery()
  const issuesMap: { [status: string]: number } = {}
  let currentTeam: Team | undefined
  let issues: Issue[] = []
  let statusesById: ReadonlyMap<Ref<IssueStatus>, WithLookup<IssueStatus>> = new Map()

  $: totalIssues = getTotalIssues(issuesMap)

  $: baseQuery = {
    space: currentSpace,
    ...includedIssuesQuery,
    ...filteredIssuesQuery,
    ...query
  }

  $: resultQuery = search === '' ? baseQuery : { $search: search, ...baseQuery }

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  $: groupByKey = issuesGroupKeyMap[groupingKey]
  $: categories = getCategories(groupByKey, issues, !!shouldShowEmptyGroups)
  $: displayedCategories = (categories as any[]).filter((x) => {
    if (groupByKey === undefined || includedGroups[groupByKey] === undefined) {
      return true
    }

    if (groupByKey === 'status') {
      const category = statusesById.get((x as Ref<IssueStatus>))?.$lookup?.category

      return !!(category && includedGroups.status?.includes(category._id))
    }

    return includedGroups[groupByKey]?.includes(x)
  })
  $: includedIssuesQuery = getIncludedIssuesQuery(includedGroups)
  $: filteredIssuesQuery = getModifiedOnIssuesFilterQuery(issues, completedIssuesPeriod)
  $: statuses = [...statusesById.values()]

  const getIncludedIssuesQuery = (groups: Partial<Record<IssuesGroupByKeys, Array<any>>>) => {
    const resultMap: { [p: string]: { $in: any[] } } = {}

    for (const [key, value] of Object.entries(groups)) {
      resultMap[key] = { $in: value }
    }

    return resultMap
  }

  const getModifiedOnIssuesFilterQuery = (
    currentIssues: WithLookup<Issue>[],
    period: IssuesDateModificationPeriod | null
  ) => {
    const filter: { _id: { $in: Array<Ref<Issue>> } } = { _id: { $in: [] } }

    if (!period || period === IssuesDateModificationPeriod.All) {
      return {}
    }

    for (const issue of currentIssues) {
      if (
        issue.$lookup?.status?.category === tracker.issueStatusCategory.Completed &&
        issue.modifiedOn < getIssuesModificationDatePeriodTime(period)
      ) {
        continue
      }

      filter._id.$in.push(issue._id)
    }

    return filter
  }

  $: issuesQuery.query<Issue>(
    tracker.class.Issue,
    { ...includedIssuesQuery },
    (result) => {
      issues = result
    },
    { limit: ENTRIES_LIMIT, lookup: { assignee: contact.class.Employee } }
  )

  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: currentSpace },
    (issueStatuses) => {
      statusesById = new Map(issueStatuses.map((status) => [status._id, status]))
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )

  const getCategories = (key: IssuesGroupByKeys | undefined, elements: Issue[], shouldShowAll: boolean) => {
    if (!key) {
      return [undefined] // No grouping
    }

    const existingCategories = Array.from(
      new Set(
        elements.map((x) => {
          return x[key]
        })
      )
    )

    return shouldShowAll ? defaultIssueCategories[key] ?? existingCategories : existingCategories
  }

  const getTotalIssues = (map: { [status: string]: number }) => {
    let total = 0

    for (const amount of Object.values(map)) {
      total += amount
    }

    return total
  }

  const handleOptionsUpdated = (
    result:
      | {
          orderBy: IssuesOrdering
          groupBy: IssuesGrouping
          completedIssuesPeriod: IssuesDateModificationPeriod
          shouldShowEmptyGroups: boolean
        }
      | undefined
  ) => {
    if (result === undefined) {
      return
    }

    for (const prop of Object.getOwnPropertyNames(issuesMap)) {
      delete issuesMap[prop]
    }

    groupingKey = result.groupBy
    orderingKey = result.orderBy
    completedIssuesPeriod = result.completedIssuesPeriod
    shouldShowEmptyGroups = result.shouldShowEmptyGroups

    if (result.groupBy === IssuesGrouping.Assignee || result.groupBy === IssuesGrouping.NoGrouping) {
      shouldShowEmptyGroups = undefined
    }
  }

  const handleOptionsEditorOpened = (event: MouseEvent) => {
    if (!currentSpace) {
      return
    }

    showPopup(
      ViewOptionsPopup,
      { groupBy: groupingKey, orderBy: orderingKey, completedIssuesPeriod, shouldShowEmptyGroups },
      eventToHTMLElement(event),
      undefined,
      handleOptionsUpdated
    )
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
          orderBy={issuesOrderKeyMap[orderingKey]}
          query={resultQuery}
          {statuses}
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
