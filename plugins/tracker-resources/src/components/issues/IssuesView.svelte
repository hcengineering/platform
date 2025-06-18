<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Asset, IntlString, translateCB } from '@hcengineering/platform'
  import { ComponentExtensions } from '@hcengineering/presentation'
  import { Issue, TrackerEvents } from '@hcengineering/tracker'
  import { IModeSelector, themeStore } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { FilterBar, SpaceHeader, ViewletContentView, ViewletSettingButton } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import { get } from 'svelte/store'
  import { onMount, onDestroy, tick } from 'svelte'
  import type { WorkbenchTab, TabUiState } from '@hcengineering/workbench'
  import { tabIdStore, tabsStore, updateTabUiState } from '@hcengineering/workbench-resources/src/workbench'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Issue> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''
  export let icon: Asset | undefined = undefined
  export let modeSelectorProps: IModeSelector | undefined = undefined

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewlets: Array<WithLookup<Viewlet>> | undefined = undefined;
  let viewOptions: ViewOptions | undefined

  let currentTabId: Ref<WorkbenchTab> | undefined = get(tabIdStore)
  let indicatorElement: HTMLElement | null = null;

  let search = ''
  let searchQuery: DocumentQuery<Issue> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<Issue> = { ...searchQuery }

  function saveTrackerIssueState (): void {
    console.log('[DEBUG_STATE_ISSUES] Save State: Starting for tab', currentTabId)
    if (!currentTabId) {
      console.log('[DEBUG_STATE_ISSUES] Save State: No currentTabId, skipping.')
      return
    }
    updateTabUiState(currentTabId, {
      viewletId: viewlet?._id,
      filterBarState: resultQuery
    })
    console.log('[DEBUG_STATE_ISSUES] Save State: Saved. Viewlet ID:', viewlet?._id, 'Filter State:', resultQuery)
  }

  async function restoreTrackerIssueState (): Promise<void> {
    console.log('[DEBUG_STATE_ISSUES] Restore State: Starting for tab', get(tabIdStore))
    const tabId = get(tabIdStore)
    if (!tabId) {
      console.log('[DEBUG_STATE_ISSUES] Restore State: No tabId, skipping.')
      return
    }
    console.log('[DEBUG_STATE_ISSUES] Restore State: Awaiting ticks for component render.')
    await tick()
    await tick()
    console.log('[DEBUG_STATE_ISSUES] Restore State: Ticks complete, searching tab state.')
    const tab = get(tabsStore).find((t) => t._id === tabId)
    if (tab?.uiState) {
      console.log('[DEBUG_STATE_ISSUES] Restore State: uiState found.', tab.uiState)
      const savedViewletId = tab.uiState.viewletId
      const savedFilterBarQuery = tab.uiState.filterBarState
      console.log(
        '[DEBUG_STATE_ISSUES] Restore State: Found saved Viewlet ID:',
        savedViewletId,
        'Saved Filter State:',
        savedFilterBarQuery
      )

      if (savedViewletId && viewlets && viewlets.length > 0) {
        const foundViewlet = viewlets.find((v) => v._id === savedViewletId)
        if (foundViewlet) {
          viewlet = foundViewlet
          console.log('[DEBUG_STATE_ISSUES] Restore State: Viewlet restored to ID:', viewlet?._id)
        } else {
          viewlet = viewlets[0]
          console.log(
            '[DEBUG_STATE_ISSUES] Restore State: Saved Viewlet not found, set to first available:',
            viewlet?._id
          )
        }
      } else {
        console.log('[DEBUG_STATE_ISSUES] Restore State: No saved Viewlet ID or viewlets not ready/empty.')
      }
      if (savedFilterBarQuery) {
        resultQuery = { ...searchQuery, ...savedFilterBarQuery }
        console.log('[DEBUG_STATE_ISSUES] Restore State: FilterBar query restored:', resultQuery)
      } else {
        resultQuery = { ...searchQuery }
        console.log('[DEBUG_STATE_ISSUES] Restore State: No saved FilterBar query, set to initial:', resultQuery)
      }
    } else {
      resultQuery = { ...searchQuery }
      console.log('[DEBUG_STATE_ISSUES] Restore State: No uiState found, set FilterBar to initial:', resultQuery)
    }
    console.log('[DEBUG_STATE_ISSUES] Restore State: Finished.')
  }

  $: {
    console.log('[DEBUG_STATE_ISSUES] Reactive: Tab ID change detection triggered.')
    const newTabId = get(tabIdStore)
    if (currentTabId !== newTabId) {
      console.log('[DEBUG_STATE_ISSUES] Reactive: Tab changed from', currentTabId, 'to', newTabId)
      if (currentTabId) {
        console.log('[DEBUG_STATE_ISSUES] Reactive: Saving state for previous tab', currentTabId)
        saveTrackerIssueState()
      }
      currentTabId = newTabId
      console.log('[DEBUG_STATE_ISSUES] Reactive: Restoring state for new tab', currentTabId)
      void restoreTrackerIssueState()
    } else {
      console.log('[DEBUG_STATE_ISSUES] Reactive: Tab ID unchanged, skip full tab switch logic.')
    }
  }

  $: {
    console.log('[DEBUG_STATE_ISSUES] Reactive: Viewlet change detection triggered.')
    if (currentTabId && viewlet) {
      console.log(
        '[DEBUG_STATE_ISSUES] Reactive: Viewlet changed or initialized, saving state. Viewlet ID:',
        viewlet._id
      )
      saveTrackerIssueState()
    } else {
      console.log('[DEBUG_STATE_ISSUES] Reactive: Viewlet or currentTabId not ready for saving Viewlet state.')
    }
  }

  $: {
    console.log('[DEBUG_STATE_ISSUES] Reactive: resultQuery change detection triggered.')
    if (currentTabId && resultQuery) {
      console.log(
        '[DEBUG_STATE_ISSUES] Reactive: resultQuery changed or initialized, saving state. Filters:',
        resultQuery
      )
      saveTrackerIssueState()
    } else {
      console.log('[DEBUG_STATE_ISSUES] Reactive: resultQuery or currentTabId not ready for saving FilterBar state.')
    }
  }

  onMount(async () => {
    console.log('[DEBUG_STATE_ISSUES] Lifecycle: onMount. Restoring state.')
    void restoreTrackerIssueState()
  })

  onDestroy(() => {
    console.log('[DEBUG_STATE_ISSUES] Lifecycle: onDestroy. Saving final state.')
    saveTrackerIssueState()
  })

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
  {modeSelectorProps}
  currentTabId={currentTabId}
>
  <svelte:fragment slot="header-tools">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
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
  </svelte:fragment>
</SpaceHeader>
<FilterBar
  _class={tracker.class.Issue}
  {space}
  query={searchQuery}
  {viewOptions}
  on:change={(e) => (resultQuery = e.detail)}
/>
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
