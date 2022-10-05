<script lang="ts">
  import contact, { Employee } from '@hcengineering/contact'
  import { Class, Doc, DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { IssueTemplate, ViewOptions } from '@hcengineering/tracker'
  import { defaultSP, Scroller } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import tracker from '../../plugin'
  import {
    getCategories,
    groupBy as groupByFunc,
    issuesGroupKeyMap,
    issuesOrderKeyMap,
    issuesSortOrderMap
  } from '../../utils'
  import IssuesListBrowser from '../issues/IssuesListBrowser.svelte'

  export let _class: Ref<Class<Doc>>
  export let config: (string | BuildModelKey)[]
  export let query: DocumentQuery<IssueTemplate> = {}
  export let viewOptions: ViewOptions

  $: currentSpace = typeof query.space === 'string' ? query.space : tracker.team.DefaultTeam
  $: ({ groupBy, orderBy, shouldShowEmptyGroups, shouldShowSubIssues } = viewOptions)
  $: groupByKey = issuesGroupKeyMap[groupBy]
  $: orderByKey = issuesOrderKeyMap[orderBy]

  $: groupedIssues = groupByFunc(issues, groupBy)
  $: categories = getCategories(groupByKey, issues, !!shouldShowEmptyGroups, [], employees)
  $: employees = issues.map((x) => x.$lookup?.assignee).filter(Boolean) as Employee[]

  const issuesQuery = createQuery()
  let issues: WithLookup<IssueTemplate>[] = []
  $: issuesQuery.query(
    tracker.class.IssueTemplate,
    { ...query },
    (result) => {
      issues = result
    },
    {
      sort: { [orderByKey]: issuesSortOrderMap[orderByKey] },
      lookup: {
        assignee: contact.class.Employee,
        space: tracker.class.Team,
        sprint: tracker.class.Sprint
      }
    }
  )
</script>

<div class="w-full h-full clear-mins">
  <Scroller fade={defaultSP}>
    <IssuesListBrowser
      {_class}
      {currentSpace}
      {groupByKey}
      orderBy={orderByKey}
      statuses={[]}
      {employees}
      {categories}
      itemsConfig={config}
      {groupedIssues}
    />
  </Scroller>
</div>
