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
  import contact, { Employee, formatName } from '@anticrm/contact'
  import { DocumentQuery, FindOptions, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import {
    Issue,
    Team,
    IssuesGrouping,
    IssuesOrdering,
    IssuesDateModificationPeriod,
    IssueStatus,
    IssueStatusCategory,
    IssuePriority
  } from '@anticrm/tracker'
  import { Button, Label, ScrollBox, IconOptions, showPopup, eventToHTMLElement } from '@anticrm/ui'
  import { IntlString } from '@anticrm/platform'
  import tracker from '../../plugin'
  import {
    IssuesGroupByKeys,
    issuesGroupKeyMap,
    issuesOrderKeyMap,
    getIssuesModificationDatePeriodTime,
    groupBy,
    issuesSortOrderMap
  } from '../../utils'
  import ViewOptionsPopup from './ViewOptionsPopup.svelte'
  import IssuesListBrowser from './IssuesListBrowser.svelte'

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
  const resultIssuesQuery = createQuery()
  const statusesQuery = createQuery()
  const issuesMap: { [status: string]: number } = {}
  let currentTeam: Team | undefined
  let issues: Issue[] = []
  let resultIssues: Issue[] = []
  let statusesById: ReadonlyMap<Ref<IssueStatus>, WithLookup<IssueStatus>> = new Map()
  let employees: (WithLookup<Employee> | undefined)[] = []

  $: totalIssues = issues.length

  const options: FindOptions<Issue> = {
    sort: { [issuesOrderKeyMap[orderingKey]]: issuesSortOrderMap[issuesOrderKeyMap[orderingKey]] },
    limit: ENTRIES_LIMIT,
    lookup: { assignee: contact.class.Employee, status: tracker.class.IssueStatus }
  }

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
  $: categories = getCategories(groupByKey, resultIssues, !!shouldShowEmptyGroups)
  $: groupedIssues = getGroupedIssues(groupByKey, resultIssues, categories)
  $: displayedCategories = (categories as any[]).filter((x) => {
    if (groupByKey === undefined || includedGroups[groupByKey] === undefined) {
      return true
    }

    if (groupByKey === 'status') {
      const category = statusesById.get(x as Ref<IssueStatus>)?.category

      return !!(category && includedGroups.status?.includes(category))
    }

    return includedGroups[groupByKey]?.includes(x)
  })
  $: includedIssuesQuery = getIncludedIssuesQuery(includedGroups, statuses)
  $: filteredIssuesQuery = getModifiedOnIssuesFilterQuery(issues, completedIssuesPeriod)
  $: statuses = [...statusesById.values()]

  const getIncludedIssuesQuery = (
    groups: Partial<Record<IssuesGroupByKeys, Array<any>>>,
    issueStatuses: IssueStatus[]
  ) => {
    const resultMap: { [p: string]: { $in: any[] } } = {}

    for (const [key, value] of Object.entries(groups)) {
      const includedCategories = key === 'status' ? filterIssueStatuses(issueStatuses, value) : value
      resultMap[key] = { $in: includedCategories }
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

      employees = result.map((x) => x.$lookup?.assignee)
    },
    options
  )

  $: resultIssuesQuery.query<Issue>(
    tracker.class.Issue,
    { ...resultQuery },
    (result) => {
      resultIssues = result

      employees = result.map((x) => x.$lookup?.assignee)
    },
    options
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

  const getGroupedIssues = (key: IssuesGroupByKeys | undefined, elements: Issue[], orderedCategories: any[]) => {
    if (!groupByKey) {
      return { [undefined as any]: issues }
    }

    const unorderedIssues = groupBy(elements, key)

    return Object.keys(unorderedIssues)
      .sort((o1, o2) => {
        const key1 = o1 === 'null' ? null : o1
        const key2 = o2 === 'null' ? null : o2

        const i1 = orderedCategories.findIndex((x) => x === key1)
        const i2 = orderedCategories.findIndex((x) => x === key2)

        return i1 - i2
      })
      .reduce((obj: { [p: string]: any[] }, objKey) => {
        obj[objKey] = unorderedIssues[objKey]
        return obj
      }, {})
  }

  const getCategories = (key: IssuesGroupByKeys | undefined, elements: Issue[], shouldShowAll: boolean) => {
    if (!key) {
      return [undefined] // No grouping
    }

    const defaultPriorities = [
      IssuePriority.NoPriority,
      IssuePriority.Urgent,
      IssuePriority.High,
      IssuePriority.Medium,
      IssuePriority.Low
    ]
    const defaultStatuses = Object.values(statuses).map((x) => x._id)

    const existingCategories = Array.from(
      new Set(
        elements.map((x) => {
          return x[key]
        })
      )
    )

    if (shouldShowAll) {
      if (key === 'status') {
        return defaultStatuses
      }

      if (key === 'priority') {
        return defaultPriorities
      }
    }

    if (key === 'status') {
      existingCategories.sort((s1, s2) => {
        const i1 = defaultStatuses.findIndex((x) => x === s1)
        const i2 = defaultStatuses.findIndex((x) => x === s2)

        return i1 - i2
      })
    }

    if (key === 'priority') {
      existingCategories.sort((p1, p2) => {
        const i1 = defaultPriorities.findIndex((x) => x === p1)
        const i2 = defaultPriorities.findIndex((x) => x === p2)

        return i1 - i2
      })
    }

    if (key === 'assignee') {
      existingCategories.sort((a1, a2) => {
        const employeeId1 = a1 as Ref<Employee> | null
        const employeeId2 = a2 as Ref<Employee> | null

        if (employeeId1 === null && employeeId2 !== null) {
          return 1
        }

        if (employeeId1 !== null && employeeId2 === null) {
          return -1
        }

        if (employeeId1 !== null && employeeId2 !== null) {
          const name1 = formatName(employees.find((x) => x?._id === employeeId1)?.name ?? '')
          const name2 = formatName(employees.find((x) => x?._id === employeeId2)?.name ?? '')

          if (name1 > name2) {
            return 1
          } else if (name2 > name1) {
            return -1
          }

          return 0
        }

        return 0
      })
    }

    return existingCategories
  }

  function filterIssueStatuses (
    issueStatuses: IssueStatus[],
    issueStatusCategories: Ref<IssueStatusCategory>[]
  ): Ref<IssueStatus>[] {
    const statusCategories = new Set(issueStatusCategories)

    return issueStatuses.filter((status) => statusCategories.has(status.category)).map((s) => s._id)
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
      <IssuesListBrowser
        _class={tracker.class.Issue}
        {currentSpace}
        {groupByKey}
        orderBy={issuesOrderKeyMap[orderingKey]}
        {statuses}
        {employees}
        categories={displayedCategories}
        itemsConfig={[
          { key: '', presenter: tracker.component.PriorityPresenter, props: { currentSpace } },
          { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } },
          { key: '', presenter: tracker.component.StatusEditor, props: { currentSpace, statuses } },
          { key: '', presenter: tracker.component.TitlePresenter, props: { shouldUseMargin: true } },
          { key: '', presenter: tracker.component.DueDatePresenter, props: { currentSpace } },
          { key: 'modifiedOn', presenter: tracker.component.ModificationDatePresenter },
          {
            key: '$lookup.assignee',
            presenter: tracker.component.AssigneePresenter,
            props: { currentSpace, defaultClass: contact.class.Employee, shouldShowLabel: false }
          }
        ]}
        {groupedIssues}
      />
    </div>
  </ScrollBox>
{/if}
