//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Gantt-toolbar overflow — pure collapse arithmetic.
 *
 * The Gantt toolbar is lifted into the SpaceHeader's second row, where it
 * competes for space with the search input, the filter button, the filter
 * chips and the trailing Fullscreen / More-actions cluster. Below roughly
 * 2400 px of panel width the row simply overflowed: nothing shrank, and the
 * trailing cluster was pushed outside the (overflow-hidden) header container,
 * i.e. it existed in the DOM but could never be clicked.
 *
 * The fix has two halves. The layout half lets the search group shrink and
 * freezes the trailing group (see `shrinkSearch` on `Header.svelte`). This
 * module is the other half: given the natural width of each toolbar tier and
 * the width actually available, decide which tiers stay inline and which move
 * into the "…" popover.
 *
 * Keeping the decision in a pure function is what makes it testable at all —
 * the DOM side only measures and renders.
 */

/**
 * Toolbar tiers in VISUAL left-to-right order. A tier is the smallest unit
 * that collapses as a whole; splitting e.g. the date-navigation into single
 * buttons would leave a half-usable control group behind.
 */
export const TOOLBAR_TIERS = ['group', 'nav', 'date', 'zoom', 'undo', 'savedview'] as const
export type ToolbarTier = (typeof TOOLBAR_TIERS)[number]

/**
 * Collapse order, least important first.
 *
 * - `savedview` is a passive "modified" indicator plus its update button; the
 *   same action is reachable from the More-actions menu.
 * - `date` (jump-to-date) duplicates what panning and the nav buttons do.
 * - `group` (group-by / colour-by) is view configuration, not navigation.
 * - `undo` matters while editing, but the keyboard shortcuts stay live.
 * - `zoom` and `nav` are the two controls a Gantt is unusable without, so
 *   they are the last to go.
 */
export const TOOLBAR_COLLAPSE_ORDER: readonly ToolbarTier[] = ['savedview', 'date', 'group', 'undo', 'zoom', 'nav']

/**
 * Width assumed for a tier that has never been measured. Deliberately
 * generous: over-estimating collapses one tier too many for a single frame,
 * under-estimating leaves the row overflowing — and an overflowing row is
 * what put the trailing cluster off-screen in the first place.
 */
export const TIER_FALLBACK_PX = 140

export interface ToolbarOverflowResult {
  /** Tiers that stay inline, in the order they were passed in. */
  visible: ToolbarTier[]
  /** Tiers that move into the "…" popover, in the order they were passed in. */
  hidden: ToolbarTier[]
}

/**
 * Decide the inline/collapsed split.
 *
 * @param present tiers that currently have content, in visual order
 * @param widths  measured natural width per tier (px); missing entries fall
 *                back to {@link TIER_FALLBACK_PX}
 * @param available width the toolbar cluster may occupy (px). A NEGATIVE
 *                  value means "not measured yet" and keeps everything
 *                  inline, so the first paint can measure. Zero is a real
 *                  measurement (a fully squeezed cluster) and collapses
 *                  everything — treating it as "unmeasured" would re-expand
 *                  the toolbar into a box it cannot fit into.
 * @param gap    flex gap between two inline items (px)
 * @param moreButtonWidth width the "…" trigger occupies INSIDE the measured
 *                  box (px). Pass 0 when the trigger is rendered elsewhere —
 *                  it is, see `ganttToolbarHiddenTiers` — so the arithmetic
 *                  neither reserves its width nor a gap for it.
 */
export function computeToolbarOverflow (
  present: readonly ToolbarTier[],
  widths: Readonly<Partial<Record<ToolbarTier, number>>>,
  available: number,
  gap: number,
  moreButtonWidth: number
): ToolbarOverflowResult {
  const all = present.filter((t, i) => present.indexOf(t) === i)
  if (!Number.isFinite(available) || available < 0) {
    return { visible: [...all], hidden: [] }
  }

  const widthOf = (t: ToolbarTier): number => {
    const w = widths[t]
    return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : TIER_FALLBACK_PX
  }

  const hidden = new Set<ToolbarTier>()
  const total = (): number => {
    const shown = all.filter((t) => !hidden.has(t))
    let items = shown.length
    let sum = shown.reduce((acc, t) => acc + widthOf(t), 0)
    if (hidden.size > 0 && moreButtonWidth > 0) {
      sum += moreButtonWidth
      items += 1
    }
    return sum + Math.max(0, items - 1) * gap
  }

  for (const tier of TOOLBAR_COLLAPSE_ORDER) {
    if (total() <= available) break
    if (!all.includes(tier)) continue
    hidden.add(tier)
  }

  return {
    visible: all.filter((t) => !hidden.has(t)),
    hidden: all.filter((t) => hidden.has(t))
  }
}
