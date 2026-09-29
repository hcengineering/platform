<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  Lifted Gantt toolbar. The controls render in IssuesView's SpaceHeader
  row 2 via slot overrides; their state lives in GanttView and is
  bridged here via `ganttToolbarSnapshot`. Two render sections share one
  component so the markup stays DRY:
    section="cluster"  → the toolbar proper (Group-by/Colour-by, Date-Nav,
                         Jump-to-date, Zoom, Undo/Redo, Saved-view), mounted
                         inside the SpaceHeader's `search` group
    section="trailing" → the "…" overflow trigger, More-actions (or the phone
                         drawer toggle) and the Fullscreen toggle, mounted
                         after the All/Active/Backlog ModeSelector in the
                         `extra` group

  ## Overflow behaviour

  The `search` group used to be unshrinkable, so at anything below ~2400 px
  of panel width the row overflowed and pushed the `extra` group — i.e. the
  Fullscreen and More-actions buttons — outside the `overflow: hidden`
  header container: present in the DOM, impossible to click. Two changes fix
  that, and they only take effect for consumers that opt in:

    1. `Header`'s `shrinkSearch` makes the `search` group the designated
       shrink target and freezes the `extra` group, so the trailing cluster
       is now always inside the viewport (see SpaceHeader / Header).
    2. The cluster below measures the width it actually got and moves whole
       tiers into a "…" popover, least important first
       (`lib/toolbar-overflow.ts`). On a phone-width panel that ends with
       every tier behind "…", which is exactly the reduced layout the mobile
       Gantt wants.

  Because the cluster is `flex: 1 1 auto` inside a group whose own width no
  longer depends on its content, the measured `availableWidth` is independent
  of what we decide to render — no feedback loop between measuring and
  collapsing.

  The "…" trigger itself lives in the trailing (frozen) group, not in the
  cluster: at 390 px the search group cannot fit even its own search input,
  mode selector and filter button, so the cluster is squeezed to
  `clientWidth: 0` and anything inside it is clipped and pushed out of the
  viewport. See `ganttToolbarHiddenTiers`. Its presence does feed back into
  the cluster's budget (the trailing group grows by one button), but only in
  the collapsing direction and only once, so the layout settles after a
  single extra measurement pass instead of oscillating.
-->
<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import {
    Icon,
    IconMaximize,
    IconMinimize,
    IconMoreV,
    eventToHTMLElement,
    resizeObserver,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import GanttToolbarTiers from './GanttToolbarTiers.svelte'
  import GanttToolbarOverflowPopup from './GanttToolbarOverflowPopup.svelte'
  import { ganttToolbarHiddenTiers, ganttToolbarSnapshot } from './ganttToolbarStore'
  import { TOOLBAR_TIERS, computeToolbarOverflow, type ToolbarTier } from '@hcengineering/gantt'

  export let section: 'cluster' | 'trailing'

  // Fullscreen icon state. The toggle itself lives in GanttView
  // (`snap.toggleFullscreen`); here we only mirror the browser state so the
  // button can swap between the maximize and minimize glyph. Only the
  // `trailing` instance renders the button, so only it needs the listener.
  let isFullscreen = false
  function onFullscreenChange (): void {
    isFullscreen = document.fullscreenElement != null
  }
  onMount(() => {
    if (section !== 'trailing') return
    document.addEventListener('fullscreenchange', onFullscreenChange)
    onFullscreenChange()
  })
  onDestroy(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    // Leaving Gantt mode unmounts the cluster; drop the collapse state so a
    // stale "…" trigger cannot outlive the toolbar it belongs to.
    if (section === 'cluster') ganttToolbarHiddenTiers.set([])
  })

  // ---------------------------------------------------------------------
  // Overflow measurement (cluster section only)
  // ---------------------------------------------------------------------

  /**
   * Flex `gap` between two inline items, used only until the cluster has been
   * measured once. The cluster's gap is `var(--spacing-1)`, currently 0.5rem —
   * but the real value is read off the element (see `measureGapPx`) so a
   * change to the design token cannot silently reintroduce an under-count:
   * this constant is the per-item error of the arithmetic, and at 5 tiers a
   * 4 px slip already clipped the Redo button.
   */
  const GAP_FALLBACK_PX = 8

  let clusterEl: HTMLElement | undefined
  /** -1 = never measured (keep everything inline so it CAN be measured). */
  let availableWidth = -1
  let gapPx = GAP_FALLBACK_PX
  const tierWidths: Partial<Record<ToolbarTier, number>> = {}

  /** Used `column-gap` of the cluster in px; `normal` / unparsable → fallback. */
  function measureGapPx (el: HTMLElement): number {
    const parsed = Number.parseFloat(getComputedStyle(el).columnGap)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : GAP_FALLBACK_PX
  }

  // The saved-view tier only exists while the current view is dirty; every
  // other tier is always present.
  $: presentTiers = TOOLBAR_TIERS.filter(
    (t) => t !== 'savedview' || ($ganttToolbarSnapshot?.savedViewModified ?? false)
  )

  let visibleTiers: ToolbarTier[] = [...TOOLBAR_TIERS]
  /** Mirror of the shared store, so the cluster can diff before writing. */
  let hiddenTiers: ToolbarTier[] = []

  // GanttView re-writes the snapshot store on nearly every reactive update
  // (drag previews included), so `presentTiers` is a fresh array very often.
  // Collapse it to a stable string key and hang both the re-seed and the
  // measurement pass off THAT, otherwise every snapshot write would trigger
  // a batch of getBoundingClientRect() calls mid-drag.
  $: presentKey = presentTiers.join(',')

  // Re-seed on a change of the tier SET: render everything so the newly
  // present tier can be measured, then let `recompute()` collapse again.
  // Mirrors the seeding strategy of InlineFilterChips.
  let lastPresentKey = ''
  $: if (section === 'cluster' && presentKey !== lastPresentKey) {
    lastPresentKey = presentKey
    visibleTiers = [...presentTiers]
    hiddenTiers = []
    ganttToolbarHiddenTiers.set(hiddenTiers)
  }

  function sameTiers (a: readonly ToolbarTier[], b: readonly ToolbarTier[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }

  async function recompute (): Promise<void> {
    if (section !== 'cluster') return
    await tick()
    if (clusterEl === undefined) return
    // Cache the natural width of every tier currently rendered inline.
    // Collapsed tiers keep their last measurement, which is what lets the
    // cluster re-expand when the panel grows again.
    for (const el of Array.from(clusterEl.querySelectorAll<HTMLElement>('[data-tier]'))) {
      const key = el.dataset.tier as ToolbarTier | undefined
      if (key === undefined) continue
      const w = el.getBoundingClientRect().width
      if (w > 0) tierWidths[key] = w
    }
    gapPx = measureGapPx(clusterEl)

    // The "…" trigger renders in the trailing group, outside this box, so
    // nothing is reserved for it here — passing 0 tells the arithmetic so.
    const r = computeToolbarOverflow(presentTiers, tierWidths, availableWidth, gapPx, 0)
    if (!sameTiers(r.visible, visibleTiers) || !sameTiers(r.hidden, hiddenTiers)) {
      visibleTiers = r.visible
      hiddenTiers = r.hidden
      ganttToolbarHiddenTiers.set(hiddenTiers)
    }
  }

  // `void` references make the reactive block depend on both inputs even
  // though `recompute` is async.
  $: {
    void availableWidth
    void presentKey
    void recompute()
  }

  function onClusterResize (el: Element): void {
    const w = (el as HTMLElement).clientWidth
    if (w !== availableWidth) availableWidth = w
  }

  function openOverflowPopup (e: MouseEvent): void {
    showPopup(GanttToolbarOverflowPopup, { tiers: $ganttToolbarHiddenTiers }, eventToHTMLElement(e))
  }
</script>

{#if $ganttToolbarSnapshot != null}
  {@const snap = $ganttToolbarSnapshot}
  {#if section === 'cluster'}
    <div class="gantt-tb-cluster" bind:this={clusterEl} use:resizeObserver={onClusterResize}>
      <GanttToolbarTiers {snap} tiers={visibleTiers} />
    </div>
  {/if}

  {#if section === 'trailing'}
    <!-- Trailing cluster sits AFTER the All/Active/Backlog ModeSelector and
         renders in markup order (plain flex row): the "…" overflow trigger,
         then More-actions, then the Fullscreen toggle. On phone the middle
         button toggles the slide-out drawer instead; on desktop it opens the
         More-Actions menu (Save / Load / Export). This group is frozen
         (`Header` `shrinkSearch`), which is what keeps all three inside the
         viewport down to 390 px. -->
    <!-- Below the workbench aside-float breakpoint (docWidth ≤ 1024, i.e. any
         non-desktop Gantt layout) the Workbench's own right side-rail
         (`#sidebar.sidebar-container.mini`, ~3.5 rem) is pinned to the viewport
         edge and overlays the header's right end — it sits on top of the frozen
         Fullscreen control and swallows a real click even though the button
         still measures as in-viewport. Reserve that rail's width on the right of
         the frozen group so the controls clear it. Desktop (> 1024 px, where the
         rail is in-flow and never overlaps) keeps its exact previous geometry. -->
    <div class="gantt-tb-trailing" class:safe-area={snap.layoutMode !== 'desktop'}>
      {#if $ganttToolbarHiddenTiers.length > 0}
        <button
          type="button"
          class="gantt-tb-overflow-btn"
          aria-haspopup="dialog"
          use:tooltip={{ label: tracker.string.GanttToolbarMore }}
          aria-label={snap.ariaLabels[tracker.string.GanttToolbarMore] ?? ''}
          on:click={openOverflowPopup}
        >
          <span class="gantt-tb-text-glyph" aria-hidden="true">…</span>
        </button>
      {/if}
      {#if snap.layoutMode === 'phone'}
        <button
          type="button"
          class="gantt-tb-icon-btn"
          use:tooltip={{
            label: snap.mobileDrawerOpen
              ? tracker.string.GanttMobileCloseSidebar
              : tracker.string.GanttMobileOpenSidebar
          }}
          on:click={snap.toggleMobileDrawer}
          aria-label={snap.ariaLabels[
            snap.mobileDrawerOpen ? tracker.string.GanttMobileCloseSidebar : tracker.string.GanttMobileOpenSidebar
          ] ?? ''}
          aria-expanded={snap.mobileDrawerOpen}
        >
          <span class="gantt-tb-text-glyph" aria-hidden="true">≡</span>
        </button>
      {:else}
        <button
          type="button"
          class="gantt-tb-icon-btn"
          use:tooltip={{ label: tracker.string.GanttMoreActions }}
          on:click={snap.openMoreActionsMenu}
          aria-label={snap.ariaLabels[tracker.string.GanttMoreActions] ?? ''}
        >
          <Icon icon={IconMoreV} size="small" />
        </button>
      {/if}
      <button
        class="gantt-tb-icon-btn"
        type="button"
        use:tooltip={{ label: tracker.string.GanttFullscreen }}
        on:click={snap.toggleFullscreen}
        aria-label={snap.ariaLabels[tracker.string.GanttFullscreen] ?? ''}
        aria-pressed={isFullscreen}
      >
        <Icon icon={isFullscreen ? IconMinimize : IconMaximize} size="small" />
      </button>
    </div>
  {/if}
{/if}

<style lang="scss">
  /* The cluster is the toolbar's own flex row. It grows into whatever space
     the `search` group has left over and shrinks past its content width
     (`min-width: 0`), which is what makes the measured `clientWidth` a
     content-independent budget for the overflow arithmetic.

     `overflow: hidden` is a belt-and-braces guard only: the collapse logic
     is supposed to keep the content inside the box, and this makes sure a
     single unmeasured frame can never push a control outside the viewport.

     Note the natural `row` direction — the surrounding
     `.hulyHeader-buttonsGroup.search` is `row-reverse`, but that only
     reverses ITS children, and the cluster is a single child. */
  .gantt-tb-cluster {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: var(--spacing-1);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
  }

  /* Frozen trailing group wrapper. A plain flex row so the overflow trigger,
     More-actions/drawer toggle and Fullscreen keep the same spacing they had as
     direct children of the header's `extra` group. */
  .gantt-tb-trailing {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-1);

    /* Reserve the width of the workbench mini side-rail
       (`#sidebar.sidebar-container.mini` = calc(3.5rem + 1px)) plus one grid gap,
       so the rightmost control (Fullscreen) clears the overlay and is clickable
       at phone/tablet widths. Only applied while the rail floats (non-desktop);
       desktop layouts are untouched. */
    &.safe-area {
      padding-right: calc(3.5rem + 1px + var(--spacing-1));
    }
  }

  .gantt-tb-icon-btn,
  .gantt-tb-overflow-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    color: var(--theme-content-color);
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: var(--theme-button-hovered);
      color: var(--theme-caption-color);
    }
  }
  .gantt-tb-overflow-btn {
    border-color: var(--theme-button-border);
  }

  .gantt-tb-text-glyph {
    font-size: 1rem;
    line-height: 1;
  }
</style>
