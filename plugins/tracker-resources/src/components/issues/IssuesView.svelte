<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Asset, IntlString, translateCB } from '@hcengineering/platform'
  import { ComponentExtensions } from '@hcengineering/presentation'
  import { Issue, TrackerEvents } from '@hcengineering/tracker'
  import {
    Button,
    IconAdd,
    IModeSelector,
    ModeSelector,
    SearchInputAdvanced,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    InlineFilterChips,
    SpaceHeader,
    ViewletContentView,
    ViewletSettingButton,
    filterStore,
    getViewOptions,
    rawSearchTextStore,
    resultIssueCountStore,
    searchHighlightEnabledStore,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import GanttToolbarBar from '../gantt/GanttToolbarBar.svelte'
  import SearchEmptyState from '../SearchEmptyState.svelte'
  import { shouldShowEmptyState } from '../SearchEmptyState.helpers'

  function newIssue (): void {
    showPopup(CreateIssue, { space, shouldSaveDraft: true }, 'top')
  }

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Issue> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''
  export let icon: Asset | undefined = undefined
  export let modeSelectorProps: IModeSelector | undefined = undefined

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  const viewlets: WithLookup<Viewlet>[] | undefined = undefined
  let viewOptions: ViewOptions | undefined

  // The Gantt viewlet has its own toolbar inside GanttView with dedicated
  // Filter / Group-by / Sort / Tree-View / Virtualization controls. The
  // standard ViewletSettingButton renders TWO icon buttons (ViewOptions
  // + Configure) which both carry the "Customize View" tooltip but only
  // the first wires up to the underlying viewOptions; worse, its
  // groupBy/orderBy doesn't drive the Gantt view at all. Hide them in
  // Gantt mode so the user isn't left clicking dead buttons — but still
  // resolve a viewOptions object inline so ViewletContentView mounts
  // (without it the Gantt component never renders).
  $: isGanttMode = viewlet?.descriptor === tracker.viewlet.Gantt
  $: if (isGanttMode && viewlet !== undefined) {
    viewOptions = getViewOptions(viewlet, $viewOptionStore)
  }

  // Single search source-of-truth. The legacy `search` binding still
  // exists for SpaceHeader's internal SearchInput (only used when
  // overrideSearch=false — never reached today). The new path uses
  // searchRaw + searchEncoded written by SearchInputAdvanced. The
  // `rawSearchTextStore` mirrors searchRaw so HighlightedText consumers
  // can read it without prop-drilling.
  let search = ''
  let searchRaw = ''
  let searchEncoded = ''

  function onSearchChange (e: CustomEvent<{ raw: string, encoded: string }>): void {
    searchRaw = e.detail.raw
    searchEncoded = e.detail.encoded
  }

  // Sync rawSearchTextStore reactively with the LOCAL searchRaw so that
  // route/space changes that remount this component immediately reset
  // the global store to the empty initial value. Previously the store
  // was only written from onSearchChange(), so the new view mounted
  // with an empty input field but the global store still held the
  // PREVIOUS view's search text — Empty-State + match-highlight could
  // then react to a stale query that the user never typed in this view.
  $: rawSearchTextStore.set(searchRaw)
  onDestroy(() => {
    rawSearchTextStore.set('')
  })

  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (eff: string): void {
    searchQuery = eff === '' ? { ...query } : { ...query, $search: eff }
  }
  $: if (query !== undefined) updateSearchQuery(searchEncoded)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  $: if (title) {
    translateCB(title, {}, $themeStore.language, (res) => {
      label = res
    })
  }

  // Mirror the Customize-View toggle into a store so HighlightedText
  // consumers (IssuePresenter, GanttSidebarColumn) can short-circuit to a
  // no-op when the user turns highlighting off. Defaults to true on first
  // mount so the toggle's default-on behaviour is honoured.
  $: searchHighlightEnabledStore.set((viewOptions?.searchHighlight ?? true) !== false)

  // Reset the result-count store to -1 on every search or filter change.
  // Without this reset, a stale 0 from a previous query would leave the
  // empty-state card stuck after the user retyped — the new query is
  // already in flight but the card reads the old 0 until the viewlet's
  // LiveQuery callback delivers the new count. The reset re-arms the
  // sentinel so the card disappears immediately on input change and only
  // re-appears when the new query confirms zero hits.
  $: {
    void searchEncoded
    void $filterStore
    resultIssueCountStore.set(-1)
  }

  // Empty-state is shown only when the user has typed something AND the
  // viewlet returned zero results. Until the viewlet writes a real count
  // (List.svelte / KanbanView.svelte / GanttView.svelte) the store stays
  // at -1, so the "no hits" card cannot flash during initial load before
  // the first query response.
  $: showEmptyState = shouldShowEmptyState($rawSearchTextStore, $resultIssueCountStore)
</script>

<SpaceHeader
  _class={tracker.class.Issue}
  {icon}
  bind:viewlet
  bind:search
  showLabelSelector={$$slots.label_selector}
  viewletQuery={{ attachTo: tracker.class.Issue, variant: { $nin: ['subissue', 'component', 'milestone'] } }}
  {viewlets}
  {label}
  {space}
  {resultQuery}
  modeSelectorProps={isGanttMode ? undefined : modeSelectorProps}
  overrideSearch={true}
>
  <svelte:fragment slot="header-tools">
    <ViewletSettingButton
      bind:viewOptions
      bind:viewlet
      hideGroupingAndOrdering={isGanttMode}
      showConfigureColumns={!isGanttMode}
      hideKeys={isGanttMode ? ['ganttGroupBy'] : []}
    />
  </svelte:fragment>

  <!-- Search slot is now consumed by every Tracker viewlet (not just
       Gantt), so SearchInputAdvanced + prefix-operators + searchScope +
       rawSearchTextStore + match-highlight + empty-state all work in
       List / Kanban too. Gantt additionally lifts the GanttToolbarBar
       sections (Group-by, Date-Nav, Zoom, Undo/Redo) into the same row
       so the toolbar stays a single visual unit. -->
  <svelte:fragment slot="search" let:search let:setSearch>
    {#if isGanttMode}
      <!-- Search cluster uses flex-direction: row-reverse (huly UI
           convention), so child markup order is REVERSED from visual L→R.
           Desired visual L→R: Lupe → Filter → Group-by → Date-Nav → Week →
           days → Undo/Redo. So markup: FIRST=rest of toolbar (visually
           rightmost), then Group-by, then Filter, then LAST=Lupe (visually
           leftmost). -->
      <GanttToolbarBar section="search-end" />
      <GanttToolbarBar section="search-mid" />
      <InlineFilterChips _class={tracker.class.Issue} {space} constrained />
      <FilterButton _class={tracker.class.Issue} {space} />
      {#if modeSelectorProps !== undefined && (viewOptions?.showQuickModeSelector ?? true) !== false}
        <ModeSelector kind={'subtle'} props={modeSelectorProps} />
      {/if}
      <SearchInputAdvanced
        value={searchRaw}
        on:change={onSearchChange}
        scope={viewOptions?.searchScope ?? 'all'}
        collapsed
      />
    {:else}
      <SearchInputAdvanced
        value={searchRaw}
        on:change={onSearchChange}
        scope={viewOptions?.searchScope ?? 'all'}
        collapsed
      />
      <FilterButton _class={tracker.class.Issue} {space} />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="extra-trailing">
    {#if isGanttMode}
      <!-- extra cluster is flex-direction: row (not row-reverse), so markup
           order matches visual order. Hamburger first → Fullscreen last,
           per the user's spec (swapped from the legacy fullscreen-first
           ordering). -->
      <GanttToolbarBar section="trailing" />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="extra">
    <!-- Default extra slot is empty: ModeSelector is rendered by SpaceHeader
         from `modeSelectorProps`; trailing icons go into extra-trailing. -->
  </svelte:fragment>

  <svelte:fragment slot="label_selector">
    <slot name="label_selector" />
  </svelte:fragment>

  <svelte:fragment slot="type_selector">
    <slot name="type_selector" {viewlet} />
  </svelte:fragment>

  <svelte:fragment slot="actions">
    <ComponentExtensions
      extension={tracker.extensions.IssueListHeader}
      props={{ size: 'small', kind: 'tertiary', space }}
    />
    <Button
      kind="primary"
      icon={IconAdd}
      iconProps={{ size: 'medium' }}
      shape="round"
      showTooltip={{ label: tracker.string.NewIssue }}
      on:click={newIssue}
    />
  </svelte:fragment>
</SpaceHeader>

<!-- FilterBar owns the filter→resultQuery data path (debounced via
     reduceCalls, shared with non-Tracker consumers). hideChips=true
     suppresses its chip render — chips are mounted separately by
     InlineFilterChips (inline in Gantt mode, below-header otherwise). -->
<FilterBar
  _class={tracker.class.Issue}
  {space}
  query={searchQuery}
  {viewOptions}
  hideChips={true}
  on:change={(e) => (resultQuery = e.detail)}
/>
<slot name="afterHeader" />
{#if !isGanttMode}
  <!-- List / Kanban modes: render the chip strip below the SpaceHeader.
       Gantt has its own inline placement inside the search slot above.
       Mounted unconditionally so it stays available the instant the
       user adds a filter; the visual row hides when $filterStore is
       empty (via [data-empty='true']). -->
  <div class="below-header-filters" data-empty={$filterStore.length === 0}>
    <InlineFilterChips _class={tracker.class.Issue} {space} />
  </div>
{/if}
<!-- Viewlet stays mounted AND laid out regardless of the empty-state card.
     Two earlier iterations broke live list updates:
       1. Unmounting the viewlet on showEmptyState created a self-lock — with
          no viewlet around, resultIssueCountStore never updated on retype so
          the card stuck.
       2. Keeping it mounted but toggling `display: none` on showEmptyState
          starved the virtualized viewlets (List / Gantt use a viewport-
          measured virtual scroller since the pr6 virtualization tier): while
          hidden the scroller measures a 0-height viewport and caches it, so
          when the count returns to a positive value and the wrapper re-shows,
          the stale 0-height measurement leaves ZERO rows rendered — a
          freshly created / searched issue never appears in the list even
          though its LiveQuery already delivered it. That is the uitest
          regression (issues + mentions "create → search → open" timing out
          on the row locator).
     The empty-state is therefore a non-suppressive sibling: the live viewlet
     is never collapsed, so its scroller always has a real viewport and always
     renders its rows. The card only ever adds an informational panel; it can
     never hide a populated list. `display: contents` is kept so
     ViewletContentView stays a direct flex child of the page-level layout —
     the chain Gantt's `height: 100%` depends on. -->
<div class="viewlet-wrap">
  {#if viewlet && viewOptions}
    <ViewletContentView
      _class={tracker.class.Issue}
      {viewlet}
      query={resultQuery}
      {space}
      {viewOptions}
      createItemDialog={CreateIssue}
      createItemLabel={tracker.string.AddIssueTooltip}
      createItemEvent={TrackerEvents.IssuePlusButtonClicked}
      createItemDialogProps={{ shouldSaveDraft: true }}
    />
  {/if}
</div>
{#if showEmptyState}
  <SearchEmptyState searchText={$rawSearchTextStore} activeFilters={$filterStore.map((f) => f.key.key)} />
{/if}

<style lang="scss">
  .below-header-filters {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    min-height: 1.75rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .below-header-filters[data-empty='true'] {
    display: none;
  }
  /* `display: contents` lets the wrapper disappear from layout so
     ViewletContentView stays a direct flex item of the page-level chain
     (Gantt's `height: 100%` depends on that). The wrapper is NEVER switched
     to `display: none` — doing so starved the virtualized viewlet's scroller
     of a viewport and left rows unrendered after the empty-state dismissed
     itself (see the template comment above). The empty-state card is a
     sibling, so the live viewlet's layout is always intact. */
  .viewlet-wrap {
    display: contents;
  }
</style>
