<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { IModeSelector, SearchEdit, ModeSelector, themeStore } from '@hcengineering/ui'
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
  export let search: string = ''
  export let query: DocumentQuery<Doc>
  export let modeSelectorProps: IModeSelector | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let resultQuery: DocumentQuery<Doc>

  let label = ''
  let searchQuery: DocumentQuery<Doc> = { ...query }
  resultQuery = search === '' ? { ...query } : { ...query, $search: search }

  $: if (!label && title) {
    translate(title, {}, $themeStore.language).then((res) => {
      label = res
    })
  }
  $: searchQuery = search === '' ? { ...query } : { ...query, $search: search }
</script>

<div class="ac-header full divide caption-height" class:header-with-mode-selector={modeSelectorProps !== undefined}>
  <div class="ac-header__wrap-title">
    <span class="ac-header__title">{label}</span>
    {#if modeSelectorProps !== undefined}
      <ModeSelector props={modeSelectorProps} />
    {/if}
  </div>
  <div class="clear-mins">
    <slot name="header-tools" />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} />
    <div class="buttons-divider" />
    <FilterButton {_class} />
  </div>
  <div class="ac-header-full medium-gap">
    <ViewletSelector bind:viewlet bind:preference bind:loading {viewletQuery} />
    <ViewletSettingButton bind:viewlet bind:viewOptions />
    <slot name="extra" />
  </div>
</div>
<FilterBar {_class} query={searchQuery} {space} {viewOptions} on:change={(e) => (resultQuery = { ...e.detail })} />
