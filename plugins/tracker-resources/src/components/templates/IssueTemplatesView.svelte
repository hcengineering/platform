<script lang="ts">
  import { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { IssueTemplate } from '@hcengineering/tracker'
  import { Button, IconAdd, IconDetails, IconDetailsFilled, showPopup } from '@hcengineering/ui'
  import view, { Viewlet } from '@hcengineering/view'
  import { FilterBar, getActiveViewletId, ViewOptionModel, ViewOptionsButton } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import { getDefaultViewOptionsTemplatesConfig } from '../../utils'
  import IssuesHeader from '../issues/IssuesHeader.svelte'
  import CreateIssueTemplate from './CreateIssueTemplate.svelte'
  import IssueTemplatesContent from './IssueTemplatesContent.svelte'

  export let query: DocumentQuery<IssueTemplate> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''
  export let viewOptionsConfig: ViewOptionModel[] = getDefaultViewOptionsTemplatesConfig()

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

  const client = getClient()

  let viewlets: WithLookup<Viewlet>[] = []

  $: update()

  async function update (): Promise<void> {
    viewlets = await client.findAll(
      view.class.Viewlet,
      { attachTo: tracker.class.IssueTemplate },
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

  const showCreateDialog = async () => {
    showPopup(CreateIssueTemplate, { targetElement: null }, 'top')
  }
</script>

<IssuesHeader {viewlets} {label} bind:viewlet bind:search showLabelSelector={$$slots.label_selector}>
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
      <ViewOptionsButton viewOptionsKey={viewlet._id} config={viewOptionsConfig} />
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
<FilterBar _class={tracker.class.IssueTemplate} query={searchQuery} on:change={(e) => (resultQuery = e.detail)} />
<div class="flex w-full h-full clear-mins">
  {#if viewlet}
    <IssueTemplatesContent {viewlet} query={resultQuery} />
  {/if}
  {#if $$slots.aside !== undefined && asideShown}
    <div class="popupPanel-body__aside flex" class:float={asideFloat} class:shown={asideShown}>
      <slot name="aside" />
    </div>
  {/if}
</div>
