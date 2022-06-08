<script lang="ts">
  import { ScrollBox } from '@anticrm/ui'
  import IssuesListBrowser from './IssuesListBrowser.svelte'
  import tracker from '../../plugin'
  import {
    Issue,
    IssuesDateModificationPeriod,
    IssuesGrouping,
    IssuesOrdering,
    IssueStatus,
    Team
  } from '@anticrm/tracker'
  import { Class, Doc, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import {
    getCategories,
    groupBy as groupByFunc,
    issuesGroupKeyMap,
    issuesOrderKeyMap,
    issuesSortOrderMap
  } from '../../utils'
  import { createQuery } from '@anticrm/presentation'
  import contact, { Employee } from '@anticrm/contact'
  import { BuildModelKey } from '@anticrm/view'

  export let _class: Ref<Class<Doc>>
  export let currentSpace: Ref<Team>
  export let config: (string | BuildModelKey)[]
  export let query = {}
  export let viewOptions: {
    groupBy: IssuesGrouping
    orderBy: IssuesOrdering
    completedIssuesPeriod: IssuesDateModificationPeriod
    shouldShowEmptyGroups: boolean
  }

  $: ({ groupBy, orderBy, shouldShowEmptyGroups } = viewOptions)
  $: groupByKey = issuesGroupKeyMap[groupBy]
  $: orderByKey = issuesOrderKeyMap[orderBy]

  const statusesQuery = createQuery()
  let statuses: IssueStatus[] = []
  $: statusesQuery.query(
    tracker.class.IssueStatus,
    { attachedTo: currentSpace },
    (result) => {
      statuses = [...result]
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )
  $: groupedIssues = groupByFunc(issues, groupBy)
  $: categories = getCategories(groupByKey, issues, !!shouldShowEmptyGroups, statuses, employees)
  $: employees = issues.map((x) => x.$lookup?.assignee).filter(Boolean) as Employee[]

  const issuesQuery = createQuery()
  let issues: WithLookup<Issue>[] = []
  $: issuesQuery.query(
    tracker.class.Issue,
    query,
    (result) => {
      issues = result
    },
    {
      sort: { [orderByKey]: issuesSortOrderMap[orderByKey] },
      limit: 200,
      lookup: { assignee: contact.class.Employee, status: tracker.class.IssueStatus }
    }
  )
</script>

<ScrollBox vertical stretch>
  <IssuesListBrowser
    {_class}
    {currentSpace}
    {groupByKey}
    orderBy={orderByKey}
    {statuses}
    {employees}
    {categories}
    itemsConfig={config}
    {groupedIssues}
  />
</ScrollBox>
