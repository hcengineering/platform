//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { WorkingDaysConfig } from '@hcengineering/tracker'

const DAY_MS = 86_400_000

function utcMidnight (t: number): number {
  return Math.floor(t / DAY_MS) * DAY_MS
}

function holidayHas (cfg: WorkingDaysConfig, midnight: number): boolean {
  // Linear scan — typical configs have ≤ 30 entries. Switch to Set<number> if
  // user feedback reports many-holiday slowness; current usage is well below.
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
export function isWorkingDay (t: number, cfg: WorkingDaysConfig): boolean {
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
export function nextWorkingDay (t: number, cfg: WorkingDaysConfig): number {
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
export function addWorkingDays (t: number, n: number, cfg: WorkingDaysConfig): number {
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
export function workingDaysBetween (a: number, b: number, cfg: WorkingDaysConfig): number {
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
 * Finish-to-Start anchor.
 *
 * Successor starts the working day *after* `predDue`, plus `lag` working
 * days. `predDue` is the inclusive last day of the predecessor (project
 * convention — see spec §"Datums-Semantik").
 *
 * Legacy mode (`cfg === undefined`) returns `predDue + (1 + lag) * DAY_MS`.
 * The +1-day is intentional and matches critical-path.ts — this resolves
 * the pre-Phase-2 off-by-one inconsistency where scheduler.ts forgot the
 * +1-day (causing FS-anchored successors to be scheduled one day too early
 * relative to CPM).
 */
export function fsAnchor (predDue: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return predDue + (1 + lag) * DAY_MS
  return addWorkingDays(predDue, 1 + lag, cfg)
}

/** Start-to-Start anchor: successor starts `lag` working days after `predStart`. */
export function ssAnchor (predStart: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return predStart + lag * DAY_MS
  return addWorkingDays(predStart, lag, cfg)
}

/** Finish-to-Finish anchor: successor finishes `lag` working days after `predDue`. */
export function ffAnchor (predDue: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return predDue + lag * DAY_MS
  return addWorkingDays(predDue, lag, cfg)
}

/** Start-to-Finish anchor: successor finishes `lag` working days after `predStart`. */
export function sfAnchor (predStart: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return predStart + lag * DAY_MS
  return addWorkingDays(predStart, lag, cfg)
}

/** Inverse of {@link fsAnchor} for backward (pull-predecessor) traversal. */
export function fsReverseAnchor (succStart: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return succStart - (1 + lag) * DAY_MS
  return addWorkingDays(succStart, -(1 + lag), cfg)
}

/** Inverse of {@link ssAnchor}. */
export function ssReverseAnchor (succStart: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return succStart - lag * DAY_MS
  return addWorkingDays(succStart, -lag, cfg)
}

/** Inverse of {@link ffAnchor}. */
export function ffReverseAnchor (succDue: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return succDue - lag * DAY_MS
  return addWorkingDays(succDue, -lag, cfg)
}

/** Inverse of {@link sfAnchor}. */
export function sfReverseAnchor (succDue: number, lag: number, cfg: WorkingDaysConfig | undefined): number {
  if (cfg === undefined) return succDue - lag * DAY_MS
  return addWorkingDays(succDue, -lag, cfg)
}
