<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Asset, IntlString, translateCB } from '@hcengineering/platform'
  import { ComponentExtensions } from '@hcengineering/presentation'
  import { Issue, TrackerEvents } from '@hcengineering/tracker'
  import { Button, IconAdd, IModeSelector, ModeSelector, SearchInputAdvanced, showPopup, themeStore } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import {
    FilterButton,
    InlineFilterChips,
    SpaceHeader,
    ViewletContentView,
    ViewletSettingButton,
    filterStore,
    getViewOptions,
    rawSearchTextStore,
    resultIssueCountStore,
    viewOptionStore
  } from '@hcengineering/view-resources'
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

  //  — the Gantt viewlet has its own toolbar inside GanttView with
  // dedicated Filter / Group-by / Sort / Tree-View / Virtualization
  // controls. The standard ViewletSettingButton renders TWO icon buttons
  // (ViewOptions + Configure) which both carry the "Customize View"
  // tooltip but only the first one wires up to the underlying viewOptions;
  // worse, its groupBy/orderBy don't drive the Gantt view at all. Hide
  // them in Gantt mode so the user isn't left clicking dead buttons —
  // but still resolve a viewOptions object inline so ViewletContentView
  // mounts (without it the Gantt component never renders).
  $: isGanttMode = viewlet?.descriptor === tracker.viewlet.Gantt
  $: if (isGanttMode && viewlet !== undefined) {
    viewOptions = getViewOptions(viewlet, $viewOptionStore)
  }

  // Two distinct search states:
  // - `search` is what SpaceHeader's built-in SearchInput writes (used by
  //   List + Kanban viewlets, where SpaceHeader still manages the input).
  // - `searchRaw` + `searchEncoded` are written by SearchInputAdvanced in
  //   the Gantt-mode slot override. `searchRaw` mirrors the user input
  //   verbatim (drives the input field + the T9 HighlightedText store);
  //   `searchEncoded` is the wire-form (e.g. `searchTitle:(loader)`) sent
  //   to ES as $search.
  let search = ''
  let searchRaw = ''
  let searchEncoded = ''

  function onSearchChange (e: CustomEvent<{ raw: string, encoded: string }>): void {
    searchRaw = e.detail.raw
    searchEncoded = e.detail.encoded
    rawSearchTextStore.set(searchRaw)
  }

  // Pick whichever search-string is owned by the active viewlet's slot.
  // Gantt uses the {raw, encoded} pair via the slot override; List + Kanban
  // use the SpaceHeader-bound `search` string (legacy path).
  $: effectiveSearch = isGanttMode ? searchEncoded : search
  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (eff: string): void {
    searchQuery = eff === '' ? { ...query } : { ...query, $search: eff }
  }
  $: if (query !== undefined) updateSearchQuery(effectiveSearch)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  $: if (title) {
    translateCB(title, {}, $themeStore.language, (res) => {
      label = res
    })
  }
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
  overrideSearch={isGanttMode}
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

  <!-- Gantt mode unifies the legacy gantt-toolbar with the SpaceHeader's
       search row. Filter + Group-by + Lupe + Date-Nav + Zoom + Undo/Redo
       live in one row; trailing slot adds Hamburger + Fullscreen after
       the All/Active/Backlog ModeSelector. State + handlers bridge via
       ganttToolbarSnapshot written by GanttView. List/Kanban mode keeps
       the SpaceHeader default (SearchInput + FilterButton). -->
  <svelte:fragment slot="search" let:search let:setSearch>
    {#if isGanttMode}
      <!-- The search cluster uses flex-direction: row-reverse (huly UI
           convention), so child markup order is REVERSED from visual L→R.
           Desired visual L→R: Lupe → Filter → Group-by → Date-Nav → Week →
           days → Undo/Redo. So markup: FIRST=rest of toolbar (visually
           rightmost), then Group-by, then Filter, then LAST=Lupe (visually
           leftmost). -->
      <GanttToolbarBar section="search-end" />
      <GanttToolbarBar section="search-mid" />
      <InlineFilterChips
        _class={tracker.class.Issue}
        {space}
        query={searchQuery}
        on:change={(e) => (resultQuery = e.detail)}
      />
      <FilterButton _class={tracker.class.Issue} {space} />
      {#if modeSelectorProps !== undefined && (viewOptions?.showQuickModeSelector ?? true) !== false}
        <ModeSelector kind={'subtle'} props={modeSelectorProps} />
      {/if}
      <SearchInputAdvanced
        value={searchRaw}
        on:change={onSearchChange}
        scope={(viewOptions?.searchScope ?? 'all')}
        collapsed
      />
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

<slot name="afterHeader" />
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
{#if shouldShowEmptyState($rawSearchTextStore, $resultIssueCountStore)}
  <SearchEmptyState
    searchText={$rawSearchTextStore}
    activeFilters={$filterStore.map((f) => f.key.key)}
  />
{/if}
