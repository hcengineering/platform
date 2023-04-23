<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import { Button, IconDetails, IconDetailsFilled, resolvedLocationStore } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    FilterBar,
    ViewletSettingButton,
    activeViewlet,
    getViewOptions,
    makeViewletKey,
    setActiveViewletId,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import IssuesContent from './IssuesContent.svelte'
  import IssuesHeader from './IssuesHeader.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Issue> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  export let panelWidth: number = 0

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let search = ''
  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  let viewlets: WithLookup<Viewlet>[] = []

  $: update(viewlets, active)
  const viewletQuery = createQuery()
  viewletQuery.query(
    view.class.Viewlet,
    { attachTo: tracker.class.Issue, variant: { $ne: 'subissue' } },
    (res) => (viewlets = res),
    {
      lookup: {
        descriptor: view.class.ViewletDescriptor
      }
    }
  )

  let key = makeViewletKey()

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: active = $activeViewlet[key]

  async function update (viewlets: WithLookup<Viewlet>[], active: Ref<Viewlet> | null): Promise<void> {
    viewlet = viewlets.find((viewlet) => viewlet._id === active) ?? viewlets[0]
    if (viewlet !== undefined) {
      setActiveViewletId(viewlet._id)
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

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
</script>

<IssuesHeader {viewlets} {label} {space} bind:viewlet bind:search showLabelSelector={$$slots.label_selector}>
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
<FilterBar _class={tracker.class.Issue} query={searchQuery} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />
<slot name="afterHeader" />
<div class="flex w-full h-full clear-mins">
  {#if viewlet}
    <IssuesContent {viewlet} query={resultQuery} {space} {viewOptions} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
