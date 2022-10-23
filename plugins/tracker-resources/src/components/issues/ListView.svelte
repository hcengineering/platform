<script lang="ts">
  import contact, { Employee } from '@hcengineering/contact'
  import { Class, Doc, DocumentQuery, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, ViewOptions } from '@hcengineering/tracker'
  import { issueSP, Scroller } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import tracker from '../../plugin'
  import {
    getCategories,
    groupBy as groupByFunc,
    issuesGroupKeyMap,
    issuesOrderKeyMap,
    issuesSortOrderMap
  } from '../../utils'
  import IssuesListBrowser from './IssuesListBrowser.svelte'

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
  <Scroller fade={issueSP} horizontal>
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
