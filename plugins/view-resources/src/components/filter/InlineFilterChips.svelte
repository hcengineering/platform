<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  Presentational chip strip for active filters. Renders the active filter
  list in a single horizontal row; trailing chips collapse to a "+N" button
  + popover when the row is too narrow. The query/data path is owned by
  <FilterBar hideChips=true> mounted by the same consumer — this component
  is display-only and never dispatches change events.

  Consumers that need both visual chips inline AND the SaveAs row below
  mount this together with <FilterBar hideChips=true ...>.
-->
<script lang="ts">
  import type { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { Button, IconClose, Label, eventToHTMLElement, resizeObserver, showPopup, tooltip } from '@hcengineering/ui'
  import { tick } from 'svelte'
  import { filterStore, removeFilter, setFilters } from '../../filter'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'
  import InlineFilterChipsOverflow from './InlineFilterChipsOverflow.svelte'
  import { computeOverflow } from './InlineFilterChips.svelte.helpers'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined

  let containerWidth = 0
  let chipEls: HTMLElement[] = []
  let visibleCount = 0
  let hiddenCount = 0
  let widthByIndex = new Map<number, number>()
  const BADGE_RESERVE_PX = 64

  // Reset chipEls + per-index width cache whenever the filter SET changes
  // (additions or deletions). Re-keying by filter.index keeps width
  // measurements stable across cycle adds/removes that don't change the
  // existing filters' visual width — avoiding the all-chips-then-collapse
  // flash on every store mutation. The seed visibleCount = filterStore.length
  // makes the next paint render every chip so unmeasured chips can be
  // measured by recompute().
  let lastIndexes: number[] = []
  $: {
    const currentIndexes = $filterStore.map((f) => f.index)
    const sameSet =
      currentIndexes.length === lastIndexes.length &&
      currentIndexes.every((v, i) => v === lastIndexes[i])
    if (!sameSet) {
      visibleCount = $filterStore.length
      hiddenCount = 0
      chipEls = []
      // Drop stale entries for filters that are no longer present.
      const live = new Set(currentIndexes)
      for (const k of Array.from(widthByIndex.keys())) {
        if (!live.has(k)) widthByIndex.delete(k)
      }
      lastIndexes = currentIndexes
    }
  }

  async function recompute (): Promise<void> {
    await tick()
    if (containerWidth === 0) return
    const filters = $filterStore
    if (filters.length === 0) return

    // Update the per-index width cache for any chip currently rendered.
    // Chips that were collapsed previously won't be in chipEls yet — they
    // get measured the next time visibleCount = filters.length seeds them.
    for (let i = 0; i < Math.min(filters.length, chipEls.length); i++) {
      const w = chipEls[i]?.getBoundingClientRect().width ?? 0
      if (w > 0) widthByIndex.set(filters[i].index, w)
    }
    // Fall back to a conservative estimate for any filter we haven't
    // measured yet — keeps overflow math monotonic while the missing chip
    // gets a chance to render in the next pass.
    const widths = filters.map((f) => widthByIndex.get(f.index) ?? 120)
    const r = computeOverflow(widths, containerWidth, BADGE_RESERVE_PX)
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
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-label={`+${hiddenCount} hidden filters`}
        use:tooltip={{ label: view.string.HiddenFilters }}
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
      icon={IconClose}
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
    /* Use the attention/warning accent rather than the destructive-red
       state colour — "filter active" is a state cue, not a destructive
       affordance. The negative colour stays reserved for delete/abort. */
    background: var(--theme-state-attention-color, var(--theme-warning-color));
    color: var(--theme-state-attention-color-foreground, white);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      filter: brightness(1.1);
    }
    &:focus-visible {
      outline: 2px solid var(--theme-state-attention-color, var(--theme-warning-color));
      outline-offset: 1px;
    }
  }
  /* Unused IconClose import wired for the trailing button visual hint;
     removed if Lint flags as dead. */
  :global(.inline-filter-chips-wrap .button.ghost.small svg) { opacity: 0.7; }
</style>
