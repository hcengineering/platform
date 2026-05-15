//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 *  — Y-Viewport manager for the Gantt sidebar + canvas + arrow
 * layer. Single source of truth: given the outer scroller's `scrollTop` +
 * `viewportHeight` + the flattened row geometry, returns:
 *
 *   - which row indices are visible (with `overscan` rows above + below),
 *   - the total scroll height (so the scroller knows how far it can scroll),
 *   - the `paddingTop` / `paddingBottom` spacer heights for the sidebar to
 *     keep the absolute-positioned visible rows aligned with their canvas
 *     counterparts at the same y.
 *
 * This module is the **pure-logic surface** that backs the on-screen
 * virtualization. The spec mandates `@tanstack/svelte-virtual` as the
 * runtime virtualizer for the on-screen render path — see
 * `GanttSidebar.svelte` — but every coordinate decision the runtime
 * virtualizer makes (visible-range slice, padding spacers, off-viewport
 * arrow clipping, scroll-to-row) is mirrored here so we can test it
 * deterministically without a browser. Phase 3a's
 * `computeVisibleRowRange()` was the seed; this module is its v2.
 */

/** Pixel-y bounds in canvas / sidebar coordinate space. */
export interface YBounds {
  /** Top of the viewport in pixels, inclusive. */
  top: number
  /** Bottom of the viewport in pixels, exclusive. */
  bottom: number
}

/** Input to {@link computeYViewport}. */
export interface YViewportInput {
  /** Total number of rows in the flattened layout. */
  rowCount: number
  /** Uniform row height in pixels (Gantt v1 assumes a single height). */
  rowHeight: number
  /** Current `scrollTop` of the outer scroller, in pixels. */
  scrollTop: number
  /** Visible viewport height (the scroller's clientHeight), in pixels. */
  viewportHeight: number
  /** Number of extra rows rendered above + below the visible range. Default 5. */
  overscan?: number
}

/** Output of {@link computeYViewport}. */
export interface YViewportSnapshot {
  /** Inclusive `startIndex`, exclusive `endIndex` of the rendered slice. */
  visibleRange: { startIndex: number, endIndex: number }
  /** Total scrollable height in pixels (`rowCount × rowHeight`). */
  totalSize: number
  /** Spacer height above the first rendered row, in pixels. */
  paddingTop: number
  /** Spacer height below the last rendered row, in pixels. */
  paddingBottom: number
}

const DEFAULT_OVERSCAN = 5

/**
 * Compute the visible row slice for a uniformly-sized list. Defensive for
 * non-positive `rowHeight` (returns the full range) and negative scrollTop
 * (rubber-band → clamp to 0).
 */
export function computeYViewport (input: YViewportInput): YViewportSnapshot {
  const { rowCount, rowHeight, viewportHeight } = input
  const overscan = input.overscan ?? DEFAULT_OVERSCAN

  if (rowCount <= 0) {
    return {
      visibleRange: { startIndex: 0, endIndex: 0 },
      totalSize: 0,
      paddingTop: 0,
      paddingBottom: 0
    }
  }

  if (rowHeight <= 0 || !Number.isFinite(rowHeight)) {
    return {
      visibleRange: { startIndex: 0, endIndex: rowCount },
      totalSize: 0,
      paddingTop: 0,
      paddingBottom: 0
    }
  }

  const scrollTop = Math.max(0, input.scrollTop)
  const firstVisible = Math.floor(scrollTop / rowHeight)
  const viewportRows = Math.max(0, Math.ceil(viewportHeight / rowHeight))
  const lastVisibleExclusive = firstVisible + viewportRows

  const startIndex = Math.max(0, firstVisible - Math.max(0, overscan))
  const endIndex = Math.min(rowCount, lastVisibleExclusive + Math.max(0, overscan))

  const totalSize = rowCount * rowHeight
  const paddingTop = startIndex * rowHeight
  const paddingBottom = Math.max(0, (rowCount - endIndex) * rowHeight)

  return {
    visibleRange: { startIndex, endIndex },
    totalSize,
    paddingTop,
    paddingBottom
  }
}

/** Pixel-y of a given row index. Clamps negative indices to 0. */
export function rowIndexToY (index: number, rowHeight: number): number {
  return Math.max(0, index) * rowHeight
}

/**
 * Pixel-y → row index (floor). Clamps to `[0, totalRows-1]`. Returns 0 for
 * an empty list or non-positive `rowHeight` (defensive).
 */
export function yToRowIndex (y: number, rowHeight: number, totalRows: number): number {
  if (totalRows <= 0 || rowHeight <= 0 || !Number.isFinite(rowHeight)) return 0
  if (y <= 0) return 0
  const idx = Math.floor(y / rowHeight)
  return Math.min(totalRows - 1, idx)
}

/**
 * Pure variant of `filterVisibleRows` that works on the variable-height row
 * layout used by the Gantt (issue + milestone + group-header). Returns the
 * rows whose `[y, y + height)` intersects `bounds`. Used by the sidebar and
 * arrow layer when the canvas already emits rows in their layout-y space.
 */
export function sliceVisibleRows<T extends { y: number, height: number }> (
  rows: readonly T[],
  bounds: YBounds
): T[] {
  if (rows.length === 0) return []
  const out: T[] = []
  for (const r of rows) {
    if (r.y + r.height > bounds.top && r.y < bounds.bottom) {
      out.push(r)
    }
  }
  return out
}
