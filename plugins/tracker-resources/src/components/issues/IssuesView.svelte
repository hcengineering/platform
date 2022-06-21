<script lang="ts">
  import core, { DocumentQuery, Ref, Space, WithLookup } from '@anticrm/core'
  import { IntlString, translate } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import {
    Issue,
    IssuesDateModificationPeriod,
    IssuesGrouping,
    IssuesOrdering,
    Team,
    ViewOptions
  } from '@anticrm/tracker'
  import { Button, IconDetails } from '@anticrm/ui'
  import view, { Viewlet } from '@anticrm/view'
  import { FilterBar } from '@anticrm/view-resources'
  import { getActiveViewletId } from '@anticrm/view-resources/src/utils'
  import tracker from '../../plugin'
  import IssuesContent from './IssuesContent.svelte'
  import IssuesHeader from './IssuesHeader.svelte'

  export let currentSpace: Ref<Team> | undefined
  export let query: DocumentQuery<Issue> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  export let panelWidth: number = 0

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewOptions: ViewOptions = {
    groupBy: IssuesGrouping.Status,
    orderBy: IssuesOrdering.Status,
    completedIssuesPeriod: IssuesDateModificationPeriod.All,
    shouldShowEmptyGroups: false,
    shouldShowSubIssues: false
  }

  let search: string = ''
  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: updateSearchQuery(search)
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  const client = getClient()

  let viewlets: WithLookup<Viewlet>[] = []

  $: update(currentSpace)

  async function update (currentSpace?: Ref<Space>): Promise<void> {
    const space = await client.findOne(core.class.Space, { _id: currentSpace })
    if (space) {
      viewlets = await client.findAll(
        view.class.Viewlet,
        { attachTo: tracker.class.Issue },
        {
          lookup: {
            descriptor: view.class.ViewletDescriptor
          }
        }
      )
      const _id = getActiveViewletId()
      viewlet = viewlets.find((viewlet) => viewlet._id === _id) || viewlets[0]
    }
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
</script>

{#if currentSpace}
  <IssuesHeader {currentSpace} {viewlets} {label} bind:viewlet bind:viewOptions bind:search>
    <svelte:fragment slot="extra">
      {#if asideFloat && $$slots.aside}
        <Button
          icon={IconDetails}
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
  <FilterBar _class={tracker.class.Issue} query={searchQuery} on:change={(e) => (resultQuery = e.detail)} />
  <div class="flex w-full h-full clear-mins">
    {#if viewlet}
      <IssuesContent {currentSpace} {viewlet} query={resultQuery} {viewOptions} />
    {/if}
    {#if $$slots.aside !== undefined && asideShown}
      <div class="popupPanel-body__aside" class:float={asideFloat} class:shown={asideShown}>
        <slot name="aside" />
      </div>
    {/if}
  </div>
{/if}
