//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3a — Sidebar virtualization range helper.
 *
 * Pure-logic computation of which row indices are visible inside a scrolled
 * viewport, with `overscan` rows rendered above/below the viewport edge to
 * avoid empty frames during scroll. Mirrors the existing canvas viewport
 * pattern (`viewport.ts`) so the sidebar can later be wired to the same
 * `scrollTop` cursor without inventing a new coordinate system.
 *
 * The DOM is **not** touched in this module — the helper is consumable from
 * Svelte reactive blocks, smoke tests, and unit tests without a browser.
 * Phase 3a v1 keeps the renderer non-virtualised (DOM is still all-rows)
 * so the existing scroll-coupling between sidebar and canvas survives; the
 * helper is staged for the follow-up that activates the virtual list.
 */

/** Input parameters for {@link computeVisibleRowRange}. */
export interface VisibleRangeInput {
  /** Total number of rows in the data set. */
  totalRows: number
  /** Uniform row height in pixels (v1 assumes a single height across all rows). */
  rowHeight: number
  /** Current scroll-top of the viewport in pixels. Negative values (rubber-band) are clamped. */
  scrollTop: number
  /** Visible height of the viewport in pixels. */
  viewportHeight: number
  /** Number of extra rows to render above and below the viewport edge. */
  overscan: number
}

/** Output shape — index range + the top/bottom spacer heights. */
export interface VisibleRange {
  /** Inclusive lower bound on the visible row index. */
  start: number
  /** Exclusive upper bound on the visible row index. */
  end: number
  /** Spacer height in pixels above the first rendered row. */
  paddingTop: number
  /** Spacer height in pixels below the last rendered row. */
  paddingBottom: number
}

/**
 * Compute the visible row range for a uniformly-sized list. Returns a safe
 * full-range when `rowHeight <= 0` (defensive — the layout engine never
 * yields zero heights in practice, but a misconfigured CSS variable could).
 */
export function computeVisibleRowRange (input: VisibleRangeInput): VisibleRange {
  const { totalRows, rowHeight, viewportHeight, overscan } = input
  if (totalRows <= 0) {
    return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0 }
  }
  if (rowHeight <= 0 || !Number.isFinite(rowHeight)) {
    return { start: 0, end: totalRows, paddingTop: 0, paddingBottom: 0 }
  }

  const scrollTop = Math.max(0, input.scrollTop)
  const firstVisible = Math.floor(scrollTop / rowHeight)
  const viewportRows = Math.max(0, Math.ceil(viewportHeight / rowHeight))
  const lastVisibleExclusive = firstVisible + viewportRows

  const start = Math.max(0, firstVisible - Math.max(0, overscan))
  const end = Math.min(totalRows, lastVisibleExclusive + Math.max(0, overscan))

  const paddingTop = start * rowHeight
  const paddingBottom = Math.max(0, (totalRows - end) * rowHeight)

  return { start, end, paddingTop, paddingBottom }
}
