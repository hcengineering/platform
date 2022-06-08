<script lang="ts">
  import core, { Ref, Space, WithLookup } from '@anticrm/core'
  import { IntlString, translate } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { IssuesDateModificationPeriod, IssuesGrouping, IssuesOrdering, Team } from '@anticrm/tracker'
  import { Button, IconDetails } from '@anticrm/ui'
  import view, { Filter, Viewlet } from '@anticrm/view'
  import { FilterBar } from '@anticrm/view-resources'
  import tracker from '../../plugin'
  import IssuesContent from './IssuesContent.svelte'
  import IssuesHeader from './IssuesHeader.svelte'

  export let currentSpace: Ref<Team> | undefined
  export let query = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  export let panelWidth: number = 0

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
  <div class="header">
    <IssuesHeader {currentSpace} {viewlets} {label} bind:viewlet bind:viewOptions bind:filters>
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
    <FilterBar _class={tracker.class.Issue} {query} bind:filters on:change={(e) => (resultQuery = e.detail)} />
  </div>
  <div class="flex h-full">
    <div class="antiPanel-component">
      <IssuesContent {currentSpace} {viewlet} query={resultQuery} {viewOptions} />
    </div>
    {#if $$slots.aside !== undefined && asideShown}
      <div class="popupPanel-body__aside" class:float={asideFloat} class:shown={asideShown}>
        <slot name="aside" />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .header {
    border-bottom: 1px solid var(--divider-color);
  }
</style>
