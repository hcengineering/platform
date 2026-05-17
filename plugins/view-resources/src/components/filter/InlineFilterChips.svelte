<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  Inline filter chips. Renders the active filter list in a single horizontal
  row; trailing chips collapse to a "+N" button + popover when the row is
  too narrow. Replaces the standalone <FilterBar /> chip-row render in the
  Tracker IssuesView. Both consumers share the same query-builder helper
  (`makeFilterQuery`), so the resulting query is bit-identical to legacy.
-->
<script lang="ts">
  import type { Class, Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, resizeObserver, showPopup } from '@hcengineering/ui'
  import type { Filter } from '@hcengineering/view'
  import { createEventDispatcher, tick } from 'svelte'
  import { filterStore, removeFilter, setFilters } from '../../filter'
  import { makeFilterQuery } from '../../filter/query-builder'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'
  import InlineFilterChipsOverflow from './InlineFilterChipsOverflow.svelte'
  import { computeOverflow } from './InlineFilterChips.svelte.helpers'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let containerWidth = 0
  let chipEls: HTMLElement[] = []
  let visibleCount = 0
  let hiddenCount = 0
  let measuredWidths: number[] = []
  let measuredForFilterCount = -1
  const BADGE_WIDTH = 64

  // Seed visibleCount = filterStore.length on every filter change so the
  // first paint renders ALL chips (enabling width measurement). The
  // ResizeObserver-triggered recompute then collapses overflow. Without
  // this seed, chips never render because chipWidths is [] on first pass.
  $: {
    visibleCount = $filterStore.length
    hiddenCount = 0
    measuredForFilterCount = -1
    measuredWidths = []
  }

  async function recompute (): Promise<void> {
    await tick()
    if (containerWidth === 0) return
    const filterCount = $filterStore.length
    if (filterCount === 0) return

    // Only re-measure when ALL chips for the current filterStore are bound
    // (visibleCount equals filterStore.length). When we've already collapsed
    // some into the +N popover, the unmounted chips report width=0 — using
    // those zeros would oscillate visibleCount and flicker the toolbar.
    if (measuredForFilterCount !== filterCount && visibleCount === filterCount) {
      const widths = chipEls
        .slice(0, filterCount)
        .map((el) => el?.getBoundingClientRect().width ?? 0)
      if (widths.length === 0 || widths.every((w) => w === 0)) return
      measuredWidths = widths
      measuredForFilterCount = filterCount
    }

    if (measuredWidths.length === 0) return
    const r = computeOverflow(measuredWidths, containerWidth, BADGE_WIDTH)
    if (r.visibleCount !== visibleCount || r.hiddenCount !== hiddenCount) {
      visibleCount = r.visibleCount
      hiddenCount = r.hiddenCount
    }
  }

  // Re-run on filter-store or container-width change. The `void` references
  // make the reactive block depend on both even though `recompute` is async.
  $: {
    void $filterStore
    void containerWidth
    void recompute()
  }

  function onContainerResize (el: Element): void {
    const w = (el as HTMLElement).clientWidth
    if (w !== containerWidth) containerWidth = w
  }

  async function rebuildQuery (filters: Filter[]): Promise<void> {
    const next = await makeFilterQuery(
      query,
      filters,
      async (id) => await client.findOne(view.class.FilterMode, { _id: id }),
      undefined,
      hierarchy
    )
    dispatch('change', next)
  }
  $: void rebuildQuery($filterStore)

  function openOverflowPopover (e: MouseEvent): void {
    showPopup(InlineFilterChipsOverflow, { hiddenStartIndex: visibleCount, space }, eventToHTMLElement(e))
  }

  // Reference _class to keep the prop usable for future affordances (chip-add
  // popovers reuse it). The current component does not need it because the
  // add affordance lives on FilterButton, but consumers pass it for symmetry
  // with <FilterBar />.
  $: void _class
</script>

<div class="inline-filter-chips-wrap">
  <!-- Inner container is the scroll/measurement viewport. The wrap layer
       above caps the width so the chip cluster cannot push the rest of
       the toolbar off-screen. computeOverflow uses the inner container
       width via ResizeObserver; once chips overflow it collapses them
       into the +N popover. -->
  <div class="inline-filter-chips" use:resizeObserver={onContainerResize}>
    {#each $filterStore as filter, i (filter.index)}
      {#if i < visibleCount}
        <span bind:this={chipEls[i]} class="chip-slot">
          <FilterSection
            {space}
            {filter}
            on:change={() => rebuildQuery($filterStore)}
            on:remove={() => removeFilter(i)}
          />
        </span>
      {/if}
    {/each}
    {#if hiddenCount > 0}
      <!-- Bright accent badge so an active-but-collapsed filter is
           immediately obvious instead of looking like a passive helper. -->
      <button
        class="filter-overflow-badge"
        type="button"
        on:click={openOverflowPopover}
      >
        +{hiddenCount}
      </button>
    {/if}
  </div>
  {#if $filterStore.length > 0}
    <!-- Trailing clear-all action. Lives OUTSIDE the chip container so it
         is never measured for overflow and stays visible regardless of
         how many chips are present. -->
    <Button
      kind="ghost"
      size="small"
      label={view.string.ClearFilters}
      on:click={() => setFilters([])}
    />
  {/if}
</div>

<style lang="scss">
  .inline-filter-chips-wrap {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    min-width: 0;
    flex: 0 1 auto;
    /* Hard cap on chip cluster width — beyond this, the +N popover takes
       over. Without this cap, chips push the rest of the toolbar (date
       nav, zoom, undo/redo, hamburger, fullscreen) off-screen. */
    max-width: 22rem;
  }
  .inline-filter-chips {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-wrap: nowrap;
    overflow: hidden;
    min-width: 0;
    flex: 1 1 0;
  }
  .chip-slot { flex-shrink: 0; }
  .filter-overflow-badge {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    height: 1.5rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 999px;
    background: var(--theme-state-negative-color);
    color: var(--theme-state-negative-color-foreground, white);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      filter: brightness(1.1);
    }
    &:focus-visible {
      outline: 2px solid var(--theme-state-negative-color);
      outline-offset: 1px;
    }
  }
</style>
