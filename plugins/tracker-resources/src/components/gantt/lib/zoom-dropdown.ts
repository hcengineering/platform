//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { ZoomLevel } from './types'
import { MIN_PPD, ZOOM_PX_PER_DAY } from './zoom'

/**
 *  — Dropdown selection model for the Gantt toolbar.
 *
 * The toolbar's four legacy preset buttons collapse into a single
 * Dropdown + a numeric "X days" input. Selection is one of five tags:
 *
 *   day | week | month | quarter | custom
 *
 * `custom` is **not** directly user-selectable from the dropdown — it is
 * shown only when `userPxPerDay` does not match any of the four preset
 * px/day values within `EPSILON_PPD`. Wheel-zoom flips selection to
 * `custom` automatically; clicking a preset clears `userPxPerDay = null`.
 */

export type DropdownSelection = ZoomLevel | 'custom'

/**
 * Tolerance for matching a continuous px/day value back to a preset.
 *
 * Continuous wheel-zoom can produce values like 31.997 that should still
 * highlight "Day". 0.05 px/day is well below the smallest preset (1.5)
 * and below any wheel-step that ever yields a visible move.
 */
export const EPSILON_PPD = 0.05

export const MIN_VISIBLE_DAYS = 1
export const MAX_VISIBLE_DAYS = 999

/**
 * Decide which dropdown row should appear "selected" given the current
 * `userPxPerDay` override and the active `zoom` preset.
 *
 * - `userPxPerDay === null` → the preset button is active → return `zoom`.
 * - Else if `userPxPerDay` is within `EPSILON_PPD` of any preset, return
 *   that preset (the user wheeled exactly back onto a preset).
 * - Else return `'custom'`.
 */
export function dropdownSelectionForPxPerDay (
  userPxPerDay: number | null,
  zoom: ZoomLevel
): DropdownSelection {
  if (userPxPerDay === null) return zoom
  if (!Number.isFinite(userPxPerDay) || userPxPerDay <= 0) return 'custom'
  const levels: ZoomLevel[] = ['day', 'week', 'month', 'quarter']
  for (const lvl of levels) {
    if (Math.abs(userPxPerDay - ZOOM_PX_PER_DAY[lvl]) <= EPSILON_PPD) return lvl
  }
  return 'custom'
}

/**
 * How many days currently fit into the horizontal scroller viewport at
 * the given px/day scale. Used for the read-out / editable "X days"
 * input next to the Dropdown.
 *
 * Always returns at least `MIN_VISIBLE_DAYS` (1) and defends against
 * NaN, zero or negative inputs so the UI never displays nonsense.
 */
export function visibleDaysFromPxPerDay (viewportWidth: number, pxPerDay: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return MIN_VISIBLE_DAYS
  if (!Number.isFinite(pxPerDay) || pxPerDay <= 0) return MIN_VISIBLE_DAYS
  const raw = Math.round(viewportWidth / pxPerDay)
  if (raw < MIN_VISIBLE_DAYS) return MIN_VISIBLE_DAYS
  return raw
}

/**
 * Inverse of `visibleDaysFromPxPerDay`: given a user-typed day count and
 * the current viewport width, compute the px/day that would make exactly
 * that many days fit. Used when the user edits the "X days" input.
 *
 * - `days` is clamped to `[MIN_VISIBLE_DAYS, MAX_VISIBLE_DAYS]`.
 * - Returns `MIN_PPD` for invalid viewport widths so the caller can
 *   still apply the result without further error handling.
 */
export function pxPerDayFromVisibleDays (viewportWidth: number, days: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return MIN_PPD
  let clamped: number
  if (!Number.isFinite(days)) {
    clamped = MIN_VISIBLE_DAYS
  } else if (days < MIN_VISIBLE_DAYS) {
    clamped = MIN_VISIBLE_DAYS
  } else if (days > MAX_VISIBLE_DAYS) {
    clamped = MAX_VISIBLE_DAYS
  } else {
    clamped = days
  }
  return viewportWidth / clamped
}
