<script lang="ts">
  import { DocumentQuery, Ref, SortingOrder, WithLookup } from '@anticrm/core'
  import { Component } from '@anticrm/ui'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@anticrm/view'
  import { Issue, IssueStatus, Team, ViewOptions } from '@anticrm/tracker'
  import tracker from '../../plugin'
  import { createQuery } from '@anticrm/presentation'

  export let currentSpace: Ref<Team>
  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Issue> = {}
  export let viewOptions: ViewOptions

  const statusesQuery = createQuery()
  const spaceQuery = createQuery()
  let currentTeam: Team | undefined
  let statusesById: ReadonlyMap<Ref<IssueStatus>, WithLookup<IssueStatus>> = new Map()

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

  $: spaceQuery.query(tracker.class.Team, { _id: currentSpace }, (res) => {
    currentTeam = res.shift()
  })

  $: statuses = [...statusesById.values()]

  const replacedKeys: Map<string, BuildModelKey> = new Map<string, BuildModelKey>([
    ['@currentTeam', { key: '', presenter: tracker.component.IssuePresenter, props: { currentTeam } }],
    ['@statuses', { key: '', presenter: tracker.component.StatusEditor, props: { statuses, justify: 'center' } }]
  ])

  function createConfig (descr: Viewlet, preference: ViewletPreference | undefined): (string | BuildModelKey)[] {
    const base = preference?.config ?? descr.config
    const result: (string | BuildModelKey)[] = []
    for (const key of base) {
      if (typeof key === 'string') {
        result.push(replacedKeys.get(key) ?? key)
      } else {
        result.push(replacedKeys.get(key.key) ?? key)
      }
    }
    return result
  }
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup?.descriptor?.component}
    props={{
      currentSpace,
      config: createConfig(viewlet, undefined),
      options: viewlet.options,
      viewlet,
      query,
      viewOptions
    }}
  />
{/if}
