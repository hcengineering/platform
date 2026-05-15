//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { ZoomLevel } from './types'

/**
 * C — continuous (Ctrl+Wheel) zoom math.
 *
 * The 4 toolbar buttons (Day/Week/Month/Quarter) remain the entry-points
 * for "snap to a sensible preset". On top of that, Ctrl+Wheel (Cmd+Wheel
 * on Mac) provides a continuous pixelsPerDay knob. We keep `zoom` as the
 * source of truth for header tick-granularity, but allow a numeric
 * override (`pxPerDayOverride`) to drive the actual horizontal scale.
 *
 * The preset values mirror the legacy `PX_PER_DAY` table in time-scale.ts.
 * `presetForPxPerDay` picks the closest preset (used by the toolbar
 * highlight after a wheel-zoom).
 */

export const MIN_PPD = 0.05
export const MAX_PPD = 200

/** Px-per-day preset for each ZoomLevel — matches time-scale.ts. */
export const ZOOM_PX_PER_DAY: Record<ZoomLevel, number> = {
  day: 32,
  week: 14,
  month: 4,
  quarter: 1.5
}

/** Clamp px/day to the supported continuous range. */
export function clampPxPerDay (ppd: number): number {
  if (Number.isNaN(ppd)) return MIN_PPD
  if (ppd <= 0) return MIN_PPD
  if (ppd < MIN_PPD) return MIN_PPD
  if (ppd > MAX_PPD) return MAX_PPD
  return ppd
}

/**
 * Adaptive sensitivity for `applyWheelZoom`. Below ~4 px/day (month and
 * quarter presets) a uniform factor produces visibly slower zoom because
 * the same per-notch multiplicative step traverses a smaller absolute
 * pixel range. Bump the factor for the low-density bands so users feel
 * the same responsiveness at every zoom level.
 */
export function adaptiveWheelFactor (currentPpd: number): number {
  if (!Number.isFinite(currentPpd) || currentPpd <= 0) return 0.012
  if (currentPpd < 4) return 0.012
  return 0.006
}

/**
 * Apply a single wheel-step (typically `event.deltaY`) to a current
 * px-per-day value. Uses an exponential mapping so that scrolling N
 * notches in the same direction zooms by the same factor regardless of
 * starting scale (no linear "snap once you cross zero" feel). Result is
 * clamped to [MIN_PPD, MAX_PPD].
 *
 * Positive `deltaY` (wheel down) zooms out; negative zooms in — matching
 * the convention used by browsers, Figma, MS Project, and Asana.
 *
 * When `factor` is omitted the per-density adaptive value from
 * `adaptiveWheelFactor` is used. Callers that need a fixed sensitivity
 * (e.g. tests) can pass an explicit factor.
 */
export function applyWheelZoom (currentPpd: number, deltaY: number, factor?: number): number {
  if (!Number.isFinite(currentPpd) || currentPpd <= 0) return clampPxPerDay(MIN_PPD)
  if (!Number.isFinite(deltaY) || deltaY === 0) return clampPxPerDay(currentPpd)
  const f = factor ?? adaptiveWheelFactor(currentPpd)
  const next = currentPpd * Math.exp(-deltaY * f)
  return clampPxPerDay(next)
}

/**
 * Compute the new scrollLeft so that the date currently under the cursor
 * stays anchored under the cursor after a zoom change. The math is purely
 * pixel-based and stateless — caller passes in the cursor position
 * relative to the scroller, the current scrollLeft, and the old/new
 * px-per-day values. Origin is implicit (cancels out).
 */
export function cursorAnchoredScrollLeft (
  cursorX: number,
  oldScrollLeft: number,
  oldPpd: number,
  newPpd: number
): number {
  if (!Number.isFinite(oldPpd) || oldPpd <= 0) return oldScrollLeft
  if (!Number.isFinite(newPpd) || newPpd <= 0) return oldScrollLeft
  const ratio = newPpd / oldPpd
  // x_world(old) = (oldScrollLeft + cursorX) / oldPpd  (in "days" units)
  // We want x_world(new) === x_world(old), so:
  // (newScrollLeft + cursorX) / newPpd = (oldScrollLeft + cursorX) / oldPpd
  // newScrollLeft = ratio * (oldScrollLeft + cursorX) - cursorX
  const next = ratio * (oldScrollLeft + cursorX) - cursorX
  return Math.max(0, next)
}

/**
 * Adaptive tick-granularity selection based on the current px-per-day.
 * Thresholds were chosen so each preset's natural pxPerDay falls into
 * the matching band, and so two adjacent presets share a sensible
 * boundary roughly mid-way between them on a log scale:
 *
 *   day=32      → day-ticks at  > 20
 *   week=14     → week-ticks in (7 .. 20]
 *   month=4     → month-ticks in (2 .. 7]
 *   quarter=1.5 → quarter-ticks at <= 2
 *
 * Returning a `ZoomLevel` keeps backward-compat with the existing
 * `createTimeScale(zoom, origin, pxPerDayOverride)` API: callers don't
 * need a new tick generator.
 */
export function pxPerDayToTickZoom (ppd: number): ZoomLevel {
  if (!Number.isFinite(ppd) || ppd <= 0) return 'quarter'
  if (ppd > 20) return 'day'
  if (ppd > 7) return 'week'
  if (ppd > 2) return 'month'
  return 'quarter'
}

/** Inverse of `pxPerDayToTickZoom` for the toolbar "active preset" highlight. */
export function presetForPxPerDay (ppd: number): ZoomLevel {
  return pxPerDayToTickZoom(ppd)
}
