<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { translateCB } from '@hcengineering/platform'
  import {
    Breadcrumb,
    Header,
    HeaderAdaptive,
    IModeSelector,
    ModeSelector,
    SearchInput,
    themeStore
  } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'

  import FilterBar from './filter/FilterBar.svelte'
  import FilterButton from './filter/FilterButton.svelte'
  import ViewletSelector from './ViewletSelector.svelte'
  import ViewletSettingButton from './ViewletSettingButton.svelte'

  export let viewletQuery: DocumentQuery<Viewlet>
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewOptions: ViewOptions | undefined
  export let preference: ViewletPreference | undefined
  export let loading = true
  export let _class: Ref<Class<Doc>>
  export let title: IntlString
  export let icon: Asset | undefined = undefined
  export let search: string = ''
  export let query: DocumentQuery<Doc>
  export let modeSelectorProps: IModeSelector | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let resultQuery: DocumentQuery<Doc>
  export let adaptive: HeaderAdaptive = 'default'
  export let hideActions: boolean = false

  let label = ''
  let searchQuery: DocumentQuery<Doc> = { ...query }
  resultQuery = search === '' ? { ...query } : { ...query, $search: search }

  $: if (!label && title) {
    translateCB(title, {}, $themeStore.language, (res) => {
      label = res
    })
  }
  $: searchQuery = search === '' ? { ...query } : { ...query, $search: search }

  $: hideExtra = modeSelectorProps === undefined && $$slots.extra === undefined
</script>

<Header {adaptive} {hideActions} {hideExtra} overflowExtra>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector bind:viewlet bind:preference bind:loading {viewletQuery} />
    <ViewletSettingButton bind:viewlet bind:viewOptions />
    <slot name="header-tools" />
  </svelte:fragment>

  <Breadcrumb {icon} title={label} size={'large'} isCurrent />

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed />
    <FilterButton {_class} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <slot name="actions" />
  </svelte:fragment>
  <svelte:fragment slot="extra">
    <slot name="extra" />
    {#if modeSelectorProps !== undefined}
      <ModeSelector kind={'subtle'} props={modeSelectorProps} />
    {/if}
  </svelte:fragment>
</Header>
<FilterBar {_class} query={searchQuery} {space} {viewOptions} on:change={(e) => (resultQuery = { ...e.detail })} />
