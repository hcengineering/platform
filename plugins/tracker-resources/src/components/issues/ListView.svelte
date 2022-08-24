<script lang="ts">
  import { Scroller } from '@anticrm/ui'
  import IssuesListBrowser from './IssuesListBrowser.svelte'
  import tracker from '../../plugin'
  import { Issue, IssueStatus, ViewOptions } from '@anticrm/tracker'
  import { Class, Doc, DocumentQuery, Ref, SortingOrder, WithLookup } from '@anticrm/core'
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
  export let config: (string | BuildModelKey)[]
  export let query: DocumentQuery<Issue> = {}
  export let viewOptions: ViewOptions

  $: currentSpace = typeof query.space === 'string' ? query.space : tracker.team.DefaultTeam
  $: ({ groupBy, orderBy, shouldShowEmptyGroups, shouldShowSubIssues } = viewOptions)
  $: groupByKey = issuesGroupKeyMap[groupBy]
  $: orderByKey = issuesOrderKeyMap[orderBy]
  $: subIssuesQuery = shouldShowSubIssues ? {} : { attachedTo: tracker.ids.NoParent }

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
    { ...subIssuesQuery, ...query },
    (result) => {
      issues = result
    },
    {
      sort: { [orderByKey]: issuesSortOrderMap[orderByKey] },
      limit: 200,
      lookup: {
        assignee: contact.class.Employee,
        status: tracker.class.IssueStatus,
        space: tracker.class.Team,
        sprint: tracker.class.Sprint,
        _id: {
          subIssues: tracker.class.Issue
        }
      }
    }
  )
</script>

<div class="w-full h-full clear-mins">
  <Scroller tableFade={categories[0] !== undefined} fadeTopOffset={48}>
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
  </Scroller>
</div>
