<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IModeSelector, ModeSelector, SearchInput, Header, Breadcrumb, HeaderAdaptive } from '@hcengineering/ui'
  import type { Asset } from '@hcengineering/platform'
  import { Viewlet } from '@hcengineering/view'
  import ViewletSelector from './ViewletSelector.svelte'
  import FilterButton from './filter/FilterButton.svelte'

  export let space: Ref<Space> | undefined = undefined
  export let _class: Ref<Class<Doc>>
  export let icon: Asset | undefined = undefined
  export let viewlet: WithLookup<Viewlet> | undefined
  export let viewletQuery: DocumentQuery<Viewlet> | undefined = undefined
  export let viewlets: Array<WithLookup<Viewlet>> = []
  export let label: string
  export let search: string
  export let showLabelSelector = false
  export let modeSelectorProps: IModeSelector | undefined = undefined
  export let adaptive: HeaderAdaptive = 'doubleRow'

  let scroller: HTMLElement
</script>

<Header
  {adaptive}
  overflowExtra
  hideActions={!$$slots.actions}
  hideExtra={!$$slots.extra && modeSelectorProps === undefined}
>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector bind:viewlet bind:viewlets ignoreFragment viewletQuery={viewletQuery ?? { attachTo: _class }} />
    <slot name="header-tools" />
  </svelte:fragment>

  {#if showLabelSelector}
    <slot name="label_selector" />
  {:else if label}
    <Breadcrumb {icon} title={label} size={'large'} isCurrent />
  {/if}
  {#if $$slots.type_selector}
    <div class="ml-2">
      <slot name="type_selector" />
    </div>
  {/if}

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed />
    <FilterButton {_class} {space} />
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
