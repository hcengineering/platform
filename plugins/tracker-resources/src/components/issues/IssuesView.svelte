<script lang="ts">
  import core, { Ref, Space, WithLookup } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import view, { Filter, Viewlet } from '@anticrm/view'
  import IssuesContent from './IssuesContent.svelte'
  import IssuesHeader from './IssuesHeader.svelte'
  import { IssuesDateModificationPeriod, IssuesGrouping, IssuesOrdering, Team } from '@anticrm/tracker'
  import tracker from '../../plugin'
  import { IntlString, translate } from '@anticrm/platform'
  import { FilterBar } from '@anticrm/view-resources'

  export let currentSpace: Ref<Team> | undefined
  export let query = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let filters: Filter[]
  let viewOptions = {
    groupBy: IssuesGrouping.Status,
    orderBy: IssuesOrdering.Status,
    completedIssuesPeriod: IssuesDateModificationPeriod.All,
    shouldShowEmptyGroups: false
  }
  let resultQuery = {}

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
      ;[viewlet] = viewlets
    }
  }
  $: if (!label && title) {
    translate(title, {}).then((res) => {
      label = res
    })
  }
</script>

{#if currentSpace}
  <IssuesHeader {currentSpace} {viewlets} {label} bind:viewlet bind:viewOptions bind:filters />
  <FilterBar _class={tracker.class.Issue} {query} bind:filters on:change={(e) => (resultQuery = e.detail)} />
  <div class="flex h-full">
    <div class="antiPanel-component">
      <IssuesContent {currentSpace} {viewlet} query={resultQuery} {viewOptions} />
    </div>
    {#if $$slots.aside !== undefined}
      <div class="antiPanel-component aside border-left">
        <slot name="aside" />
      </div>
    {/if}
  </div>
{/if}
