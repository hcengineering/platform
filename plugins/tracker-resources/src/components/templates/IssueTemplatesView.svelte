<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { IssueTemplate } from '@hcengineering/tracker'
  import { Button, IconAdd, IconDetails, IconDetailsFilled, resolvedLocationStore, showPopup } from '@hcengineering/ui'
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
  import IssuesHeader from '../issues/IssuesHeader.svelte'
  import CreateIssueTemplate from './CreateIssueTemplate.svelte'
  import IssueTemplatesContent from './IssueTemplatesContent.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<IssueTemplate> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  export let panelWidth: number = 0

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let search = ''
  let searchQuery: DocumentQuery<IssueTemplate> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: updateSearchQuery(search)
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<IssueTemplate> = { ...searchQuery }

  let viewlets: WithLookup<Viewlet>[] = []

  $: update(viewlets, active)

  const viewletQuery = createQuery()
  viewletQuery.query(view.class.Viewlet, { attachTo: tracker.class.IssueTemplate }, (res) => (viewlets = res), {
    lookup: {
      descriptor: view.class.ViewletDescriptor
    }
  })

  let key = makeViewletKey()

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: active = $activeViewlet[key]

  async function update (viewlets: WithLookup<Viewlet>[], active: Ref<Viewlet> | null): Promise<void> {
    viewlet = viewlets.find((viewlet) => viewlet._id === active) ?? viewlets[0]
    setActiveViewletId(viewlet._id)
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

  const showCreateDialog = async () => {
    showPopup(CreateIssueTemplate, { targetElement: null, space }, 'top')
  }

  $: viewOptions = getViewOptions(viewlet, $viewOptionStore)
</script>

<IssuesHeader {space} {viewlets} {label} bind:viewlet bind:search showLabelSelector={$$slots.label_selector}>
  <svelte:fragment slot="label_selector">
    <slot name="label_selector" />
  </svelte:fragment>
  <svelte:fragment slot="extra">
    <Button
      size={'small'}
      icon={IconAdd}
      label={tracker.string.IssueTemplate}
      kind={'primary'}
      on:click={showCreateDialog}
    />

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
<FilterBar
  _class={tracker.class.IssueTemplate}
  {viewOptions}
  query={searchQuery}
  on:change={(e) => (resultQuery = e.detail)}
/>
<div class="flex w-full h-full clear-mins">
  {#if viewlet && viewOptions}
    <IssueTemplatesContent {viewOptions} {viewlet} {space} query={resultQuery} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
