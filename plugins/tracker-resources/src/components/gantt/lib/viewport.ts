//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { WorkingDaysConfig } from '@hcengineering/tracker'
import { isWorkingDay } from './working-days'

const DAY_MS = 86_400_000

export function computeCanvasViewportWidth (
  scrollerClientWidth: number,
  sidebarWidth: number,
  resizeCellWidth: number
): number {
  return Math.max(1, scrollerClientWidth - sidebarWidth - resizeCellWidth)
}

export function computeCanvasRenderWidth (
  dataRangeWidth: number,
  viewportWidth: number
): number {
  return Math.max(1, dataRangeWidth, viewportWidth)
}

export function computeAdaptivePxPerDay (
  basePxPerDay: number,
  dataRangeWidth: number,
  viewportWidth: number
): number {
  if (basePxPerDay <= 0 || dataRangeWidth <= 0 || viewportWidth <= 0) return basePxPerDay
  if (dataRangeWidth >= viewportWidth) return basePxPerDay
  return basePxPerDay * (viewportWidth / dataRangeWidth)
}

export function computeTickViewport (
  viewportLeft: number,
  viewportRight: number,
  dataRangeWidth: number,
  overscan: number = 100
): { left: number, right: number } {
  const maxRight = Math.max(1, dataRangeWidth)
  return {
    left: Math.min(Math.max(0, viewportLeft - overscan), maxRight),
    right: Math.min(Math.max(0, viewportRight + overscan), maxRight)
  }
}

/**
 * Returns UTC-midnight timestamps for every non-working day in `[fromMs, toMs]`.
 * Returns `[]` when `cfg` is undefined (legacy mode — no weekend tint to draw).
 *
 * The result is capped at `maxDays` entries as a safety net for unbounded
 * viewport ranges; the default 366 covers a full year on screen, which is
 * already beyond the supported zoom-out scenarios.
 */
export function nonWorkingDaysInRange (
  fromMs: number,
  toMs: number,
  cfg: WorkingDaysConfig | undefined,
  maxDays: number = 366
): number[] {
  if (cfg === undefined) return []
  const startMs = Math.min(fromMs, toMs)
  const endMs = Math.max(fromMs, toMs)
  const start = Math.floor(startMs / DAY_MS) * DAY_MS
  const end = Math.floor(endMs / DAY_MS) * DAY_MS
  const out: number[] = []
  let cur = start
  let safety = maxDays
  while (cur <= end && safety-- > 0) {
    if (!isWorkingDay(cur, cfg)) out.push(cur)
    cur += DAY_MS
  }
  return out
}
