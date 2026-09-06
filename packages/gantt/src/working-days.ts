//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Convention: every timestamp reaching the Gantt is UTC-midnight-normalized at
// the data boundary (see `toGanttDay` in `time-scale.ts`, applied in the
// issue/milestone query callbacks of `GanttView.svelte`). The helpers here
// therefore assume — and re-assert via `utcMidnight` — that dates are UTC days,
// never local-midnight, keeping working-day/holiday classification and the
// scheduler/CPM in the same calendar frame regardless of the viewer's zone.

import type { WorkingCalendar } from './types'

const DAY_MS = 86_400_000

/**
 * Canonical UTC-day normalizer: rounds a timestamp down to its UTC midnight.
 * Exported for the scheduler's day-granular resize gate, which must classify
 * a start move by calendar DAY rather than raw milliseconds (stored issues can
 * reach the scheduler with a time-of-day on the cascade-commit path).
 */
export function utcMidnight (t: number): number {
  return Math.floor(t / DAY_MS) * DAY_MS
}

function holidayHas (cfg: WorkingCalendar, midnight: number): boolean {
  // Linear scan — typical configs have ≤ 30 entries. Switch to Set<number> if
  // a very large holiday set would become slow; current usage is well below.
  for (const h of cfg.holidays) {
    if (utcMidnight(h) === midnight) return true
  }
  return false
}

/**
 * True iff `t` falls on a configured working day. Rounds `t` to UTC midnight
 * before comparing weekday and holiday entries — so any time-of-day on a
 * working date is still a working day.
 */
export function isWorkingDay (t: number, cfg: WorkingCalendar): boolean {
  const midnight = utcMidnight(t)
  if (holidayHas(cfg, midnight)) return false
  const date = new Date(midnight)
  // getUTCDay(): 0 = Sun, 1 = Mon, …, 6 = Sat
  // weekdayMask bit 0 = Mon, …, bit 6 = Sun — remap accordingly.
  const weekdayBit = (date.getUTCDay() + 6) % 7
  return (cfg.weekdayMask & (1 << weekdayBit)) !== 0
}

/**
 * Returns the next working day ≥ `t` (UTC-midnight). If `t` itself is a
 * working day, returns its midnight. Falls back to the input's midnight after
 * 60 calendar-day iterations as a safety bail when no working days are
 * configured (weekdayMask = 0 + no holidays granting any day).
 */
export function nextWorkingDay (t: number, cfg: WorkingCalendar): number {
  let cur = utcMidnight(t)
  for (let i = 0; i < 60; i++) {
    if (isWorkingDay(cur, cfg)) return cur
    cur += DAY_MS
  }
  return utcMidnight(t)
}

/**
 * Adds `n` working days to `t`. `n` may be negative (rewind). `n = 0`
 * returns `t` unchanged (no auto-snap), so a user-pinned non-working date
 * is preserved when no shift is requested.
 *
 * Safety: aborts after `|n| × 7 + 60` iterations to guard against
 * non-progressing loops when all weekdays are non-working.
 */
export function addWorkingDays (t: number, n: number, cfg: WorkingCalendar): number {
  if (n === 0) return t
  const step = n > 0 ? DAY_MS : -DAY_MS
  let remaining = Math.abs(n)
  let cur = t
  let safety = Math.abs(n) * 7 + 60
  while (remaining > 0 && safety-- > 0) {
    cur += step
    if (isWorkingDay(cur, cfg)) remaining--
  }
  return cur
}

/**
 * Inclusive count of working days between `a` and `b` (both endpoints
 * included if they themselves are working days). Returns a negative value
 * when `a > b`, mirroring the semantics of `addWorkingDays(a, n)` where
 * `n` would be negative.
 *
 * Used by critical-path slack rendering and by potential UI summaries.
 */
export function workingDaysBetween (a: number, b: number, cfg: WorkingCalendar): number {
  const sign = a <= b ? 1 : -1
  const start = utcMidnight(Math.min(a, b))
  const end = utcMidnight(Math.max(a, b))
  let count = 0
  let cur = start
  while (cur <= end) {
    if (isWorkingDay(cur, cfg)) count++
    cur += DAY_MS
  }
  return count * sign
}

/**
 * Signed working-day step count from `from` to `to`: counts working days in
 * the half-open interval that excludes `from` and includes `to` (mirrored
 * for `to < from`). Complements the inclusive {@link workingDaysBetween}.
 * Invariant: `addWorkingDays(from, workingDayDelta(from, to, cfg), cfg)`
 * equals `utcMidnight(to)` whenever `to` falls on a working day and `from`
 * is UTC-midnight-normalized.
 */
export function workingDayDelta (from: number, to: number, cfg: WorkingCalendar): number {
  const a = utcMidnight(from)
  const b = utcMidnight(to)
  if (a === b) return 0
  const sign = b > a ? 1 : -1
  const lo = Math.min(a, b) + (sign > 0 ? DAY_MS : 0)
  const hi = Math.max(a, b) - (sign > 0 ? 0 : DAY_MS)
  let count = 0
  for (let cur = lo; cur <= hi; cur += DAY_MS) {
    if (isWorkingDay(cur, cfg)) count++
  }
  return count * sign
}

/**
 * Finish-to-Start anchor.
 *
 * Successor starts the working day *after* `predDue`, plus `lag` working
 * days. `predDue` is the inclusive last day of the predecessor (project
 * convention: both ends of a bar are inclusive days).
 *
 * Legacy mode (`cfg === undefined`) returns `predDue + (1 + lag) * DAY_MS`.
 * The +1-day is intentional and matches critical-path.ts — this resolves
 * the pre-Phase-2 off-by-one inconsistency where scheduler.ts forgot the
 * +1-day (causing FS-anchored successors to be scheduled one day too early
 * relative to CPM).
 */
export function fsAnchor (predDue: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return predDue + (1 + lag) * DAY_MS
  return addWorkingDays(predDue, 1 + lag, cfg)
}

/** Start-to-Start anchor: successor starts `lag` working days after `predStart`. */
export function ssAnchor (predStart: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return predStart + lag * DAY_MS
  return addWorkingDays(predStart, lag, cfg)
}

/** Finish-to-Finish anchor: successor finishes `lag` working days after `predDue`. */
export function ffAnchor (predDue: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return predDue + lag * DAY_MS
  return addWorkingDays(predDue, lag, cfg)
}

/** Start-to-Finish anchor: successor finishes `lag` working days after `predStart`. */
export function sfAnchor (predStart: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return predStart + lag * DAY_MS
  return addWorkingDays(predStart, lag, cfg)
}

/** Inverse of {@link fsAnchor} for backward (pull-predecessor) traversal. */
export function fsReverseAnchor (succStart: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return succStart - (1 + lag) * DAY_MS
  return addWorkingDays(succStart, -(1 + lag), cfg)
}

/** Inverse of {@link ssAnchor}. */
export function ssReverseAnchor (succStart: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return succStart - lag * DAY_MS
  return addWorkingDays(succStart, -lag, cfg)
}

/** Inverse of {@link ffAnchor}. */
export function ffReverseAnchor (succDue: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return succDue - lag * DAY_MS
  return addWorkingDays(succDue, -lag, cfg)
}

/** Inverse of {@link sfAnchor}. */
export function sfReverseAnchor (succDue: number, lag: number, cfg: WorkingCalendar | undefined): number {
  if (cfg === undefined) return succDue - lag * DAY_MS
  return addWorkingDays(succDue, -lag, cfg)
}
