<script lang="ts">
  import { DocumentQuery, Ref, SortingOrder, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { Button, IconDetails, IconDetailsFilled } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import { FilterBar, getActiveViewletId, getViewOptions } from '@hcengineering/view-resources'
  import ViewletSettingButton from '@hcengineering/view-resources/src/components/ViewletSettingButton.svelte'
  import tracker from '../../plugin'
  import IssuesContent from './IssuesContent.svelte'
  import IssuesHeader from './IssuesHeader.svelte'

  export let query: DocumentQuery<Issue> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''
  export let space: Ref<Space> | undefined

  export let panelWidth: number = 0

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let search = ''
  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  const client = getClient()

  let viewlets: WithLookup<Viewlet>[] = []

  $: update()

  async function update (): Promise<void> {
    viewlets = await client.findAll(
      view.class.Viewlet,
      { attachTo: tracker.class.Issue, variant: { $ne: 'subissue' } },
      {
        lookup: {
          descriptor: view.class.ViewletDescriptor
        }
      }
    )
    const _id = getActiveViewletId()
    viewlet = viewlets.find((viewlet) => viewlet._id === _id) || viewlets[0]
  }
  $: if (!label && title) {
    translate(title, {}).then((res) => {
      label = res
    })
  }

  let asideFloat: boolean = false
  let asideShown: boolean = true
  $: if (panelWidth < 900 && !asideFloat) asideFloat = true
  $: if (panelWidth >= 900 && asideFloat) {
    asideFloat = false
    asideShown = false
  }
  let docWidth: number
  let docSize: boolean = false
  $: if (docWidth <= 900 && !docSize) docSize = true
  $: if (docWidth > 900 && docSize) docSize = false

  const teamQuery = createQuery()

  let _teams: Map<Ref<Team>, Team> | undefined = undefined
  let _result: any
  $: teamQuery.query(tracker.class.Team, {}, (result) => {
    _result = JSON.stringify(result, undefined, 2)
    console.log('#RESULT 124', _result)
    const t = new Map<Ref<Team>, Team>()
    for (const r of result) {
      t.set(r._id, r)
    }
    _teams = t
  })
  $: console.log('#RESULT 123', _result, _teams)

  let issueStatuses: Map<Ref<Team>, WithLookup<IssueStatus>[]>

  const statusesQuery = createQuery()
  statusesQuery.query(
    tracker.class.IssueStatus,
    {},
    (statuses) => {
      const st = new Map<Ref<Team>, WithLookup<IssueStatus>[]>()
      for (const s of statuses) {
        const id = s.attachedTo as Ref<Team>
        st.set(id, [...(st.get(id) ?? []), s])
      }
      issueStatuses = st
    },
    {
      lookup: { category: tracker.class.IssueStatusCategory },
      sort: { rank: SortingOrder.Ascending }
    }
  )
  $: viewOptions = getViewOptions(viewlet)
</script>

<IssuesHeader {viewlets} {label} bind:viewlet bind:search showLabelSelector={$$slots.label_selector}>
  <svelte:fragment slot="label_selector">
    <slot name="label_selector" />
  </svelte:fragment>
  <svelte:fragment slot="extra">
    {#if viewlet}
      <ViewletSettingButton bind:viewOptions {viewlet} />
    {/if}
    {#if asideFloat && $$slots.aside}
      <div class="buttons-divider" />
      <Button
        icon={asideShown ? IconDetailsFilled : IconDetails}
        kind={'transparent'}
        size={'medium'}
        selected={asideShown}
        on:click={() => {
          asideShown = !asideShown
        }}
      />
    {/if}
  </svelte:fragment>
</IssuesHeader>
<slot name="afterHeader" />
<FilterBar _class={tracker.class.Issue} query={searchQuery} on:change={(e) => (resultQuery = e.detail)} />
<div class="flex w-full h-full clear-mins">
  {#if viewlet && _teams && issueStatuses}
    <IssuesContent {viewlet} query={resultQuery} {space} teams={_teams} {issueStatuses} {viewOptions} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
