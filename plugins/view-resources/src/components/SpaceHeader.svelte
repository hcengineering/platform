<script lang="ts">
  import { Class, Doc, DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IModeSelector, ModeSelector, SearchInput, Header, Breadcrumb, HeaderAdaptive } from '@hcengineering/ui'
  import type { Asset } from '@hcengineering/platform'
  import { ComponentExtensions, getClient } from '@hcengineering/presentation'
  import view, { Viewlet, type ViewletViewAction } from '@hcengineering/view'
  import { getViewletSpecialActions } from '../viewletUtils'
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
  export let resultQuery: DocumentQuery<Doc> = {}
  /**
   * When true the consumer's `search` slot replaces the built-in
   * SearchInput + FilterButton. Used by IssuesView in Gantt mode to lift
   * the gantt toolbar controls into row 2 alongside Filter + Lupe. Default
   * false so other viewlets keep the standard search behaviour even when
   * they forward an (otherwise empty) `search` slot upward.
   */
  export let overrideSearch: boolean = false

  let scroller: HTMLElement

  $: viewletActions = viewlet != null ? getViewletSpecialActions(getClient(), viewlet) : []

  function setSearchProp (v: string): void {
    search = v
  }
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
    {#if overrideSearch}
      <!-- Consumer-driven override. Used by IssuesView in Gantt mode to lift
           the gantt toolbar controls (Group-by, Date-Nav, Zoom, Undo/Redo)
           into the SpaceHeader's row 2, alongside Filter + SearchInput.
           The slot props expose the current search value + a setter so the
           consumer can render its own SearchInput while keeping the search
           state owned here. -->
      <slot name="search" {search} setSearch={setSearchProp} />
    {:else}
      <SearchInput bind:value={search} collapsed />
      <FilterButton {_class} {space} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each viewletActions as action (action._id)}
      <ComponentExtensions
        extension={action.extension}
        props={{
          _class,
          query: resultQuery,
          config: action.config ?? {}
        }}
      />
    {/each}
    <slot name="actions" />
  </svelte:fragment>
  <svelte:fragment slot="extra">
    <slot name="extra" />
    {#if modeSelectorProps !== undefined}
      <ModeSelector kind={'subtle'} props={modeSelectorProps} />
    {/if}
    <!-- Trailing extra cluster. Lives AFTER the ModeSelector (All/Active/
         Backlog) so consumer-supplied trailing icons (e.g. the Gantt
         Hamburger + Fullscreen) stay at the far right of row 2. -->
    <slot name="extra-trailing" />
  </svelte:fragment>
</Header>
