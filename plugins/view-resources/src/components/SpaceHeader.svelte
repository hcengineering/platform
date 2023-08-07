<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IModeSelector, ModeSelector, SearchEdit } from '@hcengineering/ui'
  import { Viewlet } from '@hcengineering/view'
  import ViewletSelector from './ViewletSelector.svelte'
  import FilterButton from './filter/FilterButton.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Doc>>
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewletQuery: DocumentQuery<Viewlet> | undefined = undefined
  export let viewlets: WithLookup<Viewlet>[] = []
  export let label: string
  export let search: string
  export let showLabelSelector = false
  export let modeSelectorProps: IModeSelector | undefined = undefined
</script>

<div
  class="ac-header full divide caption-height"
  class:header-with-mode-selector={modeSelectorProps !== undefined}
  class:header-without-label={!label}
>
  <div class="ac-header__wrap-title">
    {#if showLabelSelector}
      <slot name="label_selector" />
    {:else}
      {#if label}
        <span class="ac-header__title">{label}</span>
      {/if}
      {#if modeSelectorProps !== undefined}
        <ModeSelector props={modeSelectorProps} />
      {/if}
    {/if}
  </div>
  <div class="mb-1 clear-mins">
    <ViewletSelector bind:viewlet bind:viewlets viewletQuery={viewletQuery ?? { attachTo: _class }} />
    <slot name="header-tools" />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={() => {}} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    <div class="buttons-divider" />
    <FilterButton {_class} {space} />
  </div>
  <div class="ac-header-full medium-gap">
    <slot name="extra" />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>
