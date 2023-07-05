<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import {
    Button,
    IconDetails,
    IconDetailsFilled,
    IModeSelector,
    resolvedLocationStore,
    themeStore
  } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    FilterBar,
    SpaceHeader,
    ViewletContentView,
    ViewletSettingButton,
    activeViewlet,
    getViewOptions,
    makeViewletKey,
    updateActiveViewlet,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Issue> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''
  export let panelWidth: number = 0
  export let modeSelectorProps: IModeSelector | undefined = undefined

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let search = ''
  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  let viewlets: WithLookup<Viewlet>[] | undefined

  $: viewlet = viewlets && updateActiveViewlet(viewlets, active)
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

  $: if (!label && title) {
    translate(title, {}, $themeStore.language).then((res) => {
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

<SpaceHeader
  _class={tracker.class.Issue}
  bind:viewlet
  bind:search
  showLabelSelector={$$slots.label_selector}
  {viewlets}
  {label}
  {space}
  {modeSelectorProps}
>
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
        kind={'ghost'}
        size={'medium'}
        selected={asideShown}
        on:click={() => {
          asideShown = !asideShown
        }}
      />
    {/if}
  </svelte:fragment>
</SpaceHeader>
<FilterBar _class={tracker.class.Issue} query={searchQuery} {viewOptions} on:change={(e) => (resultQuery = e.detail)} />
<slot name="afterHeader" />
<div class="popupPanel rowContent">
  {#if viewlet}
    <ViewletContentView
      _class={tracker.class.Issue}
      {viewlet}
      query={resultQuery}
      {space}
      {viewOptions}
      createItemDialog={CreateIssue}
      createItemLabel={tracker.string.AddIssueTooltip}
      createItemDialogProps={{ shouldSaveDraft: true }}
    />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside" class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
