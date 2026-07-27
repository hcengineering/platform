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
  import type { PopupResult } from '@hcengineering/ui'
  import { Button, IconClose, Label, eventToHTMLElement, resizeObserver, showPopup, tooltip } from '@hcengineering/ui'
  import { onDestroy, tick } from 'svelte'
  import { filterStore, removeFilter, setFilters } from '../../filter'
  import view from '../../plugin'
  import FilterSection from './FilterSection.svelte'
  import InlineFilterChipsOverflow from './InlineFilterChipsOverflow.svelte'
  import { computeOverflow } from './InlineFilterChips.svelte.helpers'

  export let _class: Ref<Class<Doc>> | undefined
  export let space: Ref<Space> | undefined
  // Overflow collapsing + the 22rem width cap exist ONLY to keep a crowded
  // constrained toolbar row from being pushed off-screen. In the below-header /
  // list placement there is a full-width row available, so collapsing chips
  // into the "+N" popover just hides the active filter (and removes
  // div.filter-section from the DOM). `constrained` opts INTO the toolbar
  // behaviour; the default renders every chip inline like the legacy bar.
  export let constrained: boolean = false

  let containerWidth = 0
  let chipEls: HTMLElement[] = []
  let badgeEl: HTMLElement | undefined
  let visibleCount = 0
  let hiddenCount = 0
  const widthByIndex = new Map<number, number>()
  // Fallback reserve until the real "+N" badge has been measured once. The
  // previous 64px was ~2x the real badge (~32px), so it over-reserved and,
  // combined with a content-shrinking measurement base, drained chips behind
  // "+N" and never let them re-expand. We measure the live badge below
  // and cache it; this constant only seeds the first pass.
  const BADGE_FALLBACK_PX = 32
  let badgeWidth = BADGE_FALLBACK_PX
  // Inter-chip flex gap (`gap: var(--spacing-1)` = 0.25rem = 4px) fed into the
  // overflow math so the decision matches the real layout.
  const GAP_PX = 4

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
    const sameSet = currentIndexes.length === lastIndexes.length && currentIndexes.every((v, i) => v === lastIndexes[i])
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
    // Unconstrained (below-header/list) placement never collapses: keep every
    // chip visible so its div.filter-section stays in the DOM.
    if (!constrained) {
      if (visibleCount !== $filterStore.length || hiddenCount !== 0) {
        visibleCount = $filterStore.length
        hiddenCount = 0
      }
      return
    }
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
    // Measure the real "+N" badge once it is in the DOM so we reserve its
    // actual width instead of the 64px over-estimate that fuelled the
    // collapse spiral. Falls back to BADGE_FALLBACK_PX until first measured.
    const bw = badgeEl?.getBoundingClientRect().width ?? 0
    if (bw > 0) badgeWidth = bw
    // Fall back to a conservative estimate for any filter we haven't
    // measured yet — keeps overflow math monotonic while the missing chip
    // gets a chance to render in the next pass.
    const widths = filters.map((f) => widthByIndex.get(f.index) ?? 120)
    const r = computeOverflow(widths, containerWidth, badgeWidth, GAP_PX)
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

  // The popover receives `hiddenStartIndex` as a one-shot snapshot of
  // visibleCount, but its {#each $filterStore} body is live. If the filter set
  // (or visibleCount) changes while it is open — e.g. a chip removed from the
  // main strip or from inside the popover — that snapshot points at the wrong
  // subset. Close the popover on the first store mutation so the split-point can
  // never drift out of sync with the live store.
  let overflowPopup: PopupResult | undefined
  let unsubOverflow: (() => void) | undefined

  function cleanupOverflow (): void {
    unsubOverflow?.()
    unsubOverflow = undefined
    overflowPopup = undefined
  }

  function openOverflowPopover (e: MouseEvent): void {
    overflowPopup = showPopup(
      InlineFilterChipsOverflow,
      { hiddenStartIndex: visibleCount, space },
      eventToHTMLElement(e),
      () => {
        // User-initiated close (escape / click-outside): drop the subscription.
        cleanupOverflow()
      }
    )
    // subscribe() fires synchronously once on subscription; skip that seed call
    // and dismiss on the first real filter-set mutation.
    let seeded = false
    unsubOverflow = filterStore.subscribe(() => {
      if (!seeded) {
        seeded = true
        return
      }
      overflowPopup?.close()
      cleanupOverflow()
    })
  }

  onDestroy(() => {
    overflowPopup?.close()
    cleanupOverflow()
  })

  // Reference _class to keep the prop usable for future affordances (chip-add
  // popovers reuse it). The current component does not need it because the
  // add affordance lives on FilterButton, but consumers pass it for symmetry
  // with <FilterBar />.
  $: void _class
</script>

<!-- `empty` collapses the constrained placement away entirely. The fixed
     22rem below is a deliberate measurement base (see the note on the rule),
     but reserving it while there is not a single filter to show simply ate
     352 px of a constrained toolbar row in the default state — the very space the
     trailing controls cluster was being pushed out of. With no
     filters there is nothing to measure and nothing to render, so the whole
     wrap (chips container plus the clear-all button, which is itself gated on
     a non-empty store) can go. -->
<div class="inline-filter-chips-wrap" class:constrained class:empty={$filterStore.length === 0}>
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
            on:remove={() => {
              removeFilter(i)
            }}
          />
        </span>
      {/if}
    {/each}
    {#if hiddenCount > 0}
      <!-- Bright accent badge so an active-but-collapsed filter is
           immediately obvious instead of looking like a passive helper. -->
      <button
        bind:this={badgeEl}
        class="filter-overflow-badge"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={overflowPopup !== undefined}
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
      on:click={() => {
        setFilters([])
      }}
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
  }
  /* Fixed cluster width — beyond this, the +N popover takes over. Only
     applied in a constrained toolbar placement where chips would otherwise
     push the trailing toolbar controls off-screen. The below-header/list
     placement has a full-width row and must render every chip.

     Use a FIXED width (not max-width) so the overflow measurement base
     stays constant across collapse cycles. With max-width the wrap was
     content-sized, so once chips collapsed the measured width shrank, which
     collapsed more chips — a one-way ratchet that drained everything behind
     "+N". A fixed reference width lets computeOverflow re-test the full
     budget and re-expand chips when the filter set shrinks. */
  .inline-filter-chips-wrap.constrained {
    width: 22rem;
  }
  .inline-filter-chips-wrap.constrained.empty {
    display: none;
  }
  .inline-filter-chips {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    flex-wrap: wrap;
    min-width: 0;
    flex: 1 1 auto;
  }
  .inline-filter-chips-wrap.constrained .inline-filter-chips {
    flex-wrap: nowrap;
    overflow: hidden;
    flex: 1 1 0;
  }
  .chip-slot {
    flex-shrink: 0;
  }
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
  /* Dims the clear-all ghost button's IconClose so it reads as a secondary
     affordance next to the active chips. */
  :global(.inline-filter-chips-wrap .button.ghost.small svg) {
    opacity: 0.7;
  }
</style>
