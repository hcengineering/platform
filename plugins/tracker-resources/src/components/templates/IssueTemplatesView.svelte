<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { IssueTemplate } from '@hcengineering/tracker'
  import { Button, IconAdd, showPopup, themeStore } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { FilterBar, SpaceHeader, ViewletSettingButton } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import CreateIssueTemplate from './CreateIssueTemplate.svelte'
  import IssueTemplatesContent from './IssueTemplatesContent.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<IssueTemplate> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewlets: WithLookup<Viewlet>[] | undefined
  let viewOptions: ViewOptions | undefined

  let search = ''
  let searchQuery: DocumentQuery<IssueTemplate> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: updateSearchQuery(search)
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<IssueTemplate> = { ...searchQuery }

  $: if (!label && title) {
    translate(title, {}, $themeStore.language).then((res) => {
      label = res
    })
  }

  const showCreateDialog = async () => {
    showPopup(CreateIssueTemplate, { targetElement: null, space }, 'top')
  }
</script>

<SpaceHeader
  _class={tracker.class.IssueTemplate}
  {space}
  {viewlets}
  {label}
  bind:viewlet
  bind:search
  showLabelSelector={$$slots.label_selector}
  adaptive={'default'}
>
  <svelte:fragment slot="header-tools">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
  </svelte:fragment>
  <svelte:fragment slot="label_selector">
    <slot name="label_selector" />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <Button icon={IconAdd} label={tracker.string.IssueTemplate} kind={'primary'} on:click={showCreateDialog} />
  </svelte:fragment>
</SpaceHeader>
<slot name="afterHeader" />
<FilterBar
  _class={tracker.class.IssueTemplate}
  {space}
  {viewOptions}
  query={searchQuery}
  on:change={(e) => (resultQuery = e.detail)}
/>
{#if viewlet && viewOptions}
  <IssueTemplatesContent {viewOptions} {viewlet} {space} query={resultQuery} />
{/if}
