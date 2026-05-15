//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Tick, type ZoomLevel } from './types'

const DAY_MS = 86_400_000

const PX_PER_DAY: Record<ZoomLevel, number> = {
  day: 32,
  week: 14,
  month: 4,
  quarter: 1.5
}

/** Snap any Timestamp (ms) to the start of its UTC day. */
export function snapToUtcMidnight (t: number): number {
  const d = new Date(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export interface TimeScale {
  /** Pixel width of one calendar day at the current zoom. */
  pxPerDay: number
  /** Convert a Timestamp to its X coordinate (relative to origin). */
  toX: (t: number) => number
  /** Convert an X coordinate back to a snapped Timestamp. */
  fromX: (x: number) => number
  /** Generate header ticks across [from, to]. */
  ticks: (range: [number, number]) => Tick[]
}

export function createTimeScale (zoom: ZoomLevel, origin: number, pxPerDayOverride?: number): TimeScale {
  const pxPerDay = pxPerDayOverride ?? PX_PER_DAY[zoom]
  const originSnapped = snapToUtcMidnight(origin)

  const toX = (t: number): number => ((t - originSnapped) / DAY_MS) * pxPerDay
  const fromX = (x: number): number => snapToUtcMidnight(originSnapped + (x / pxPerDay) * DAY_MS)

  const ticks = (range: [number, number]): Tick[] => {
    const [from, to] = range
    const fromDay = snapToUtcMidnight(from)
    const result: Tick[] = []
    let cursor = fromDay

    switch (zoom) {
      case 'day': {
        // Secondary label: month name on the 1st of each month, or on the
        // first visible tick (so the user sees a context label even if the
        // viewport starts mid-month).
        let lastMonth = -1
        let first = true
        while (cursor <= to) {
          const d = new Date(cursor)
          const isMonday = d.getUTCDay() === 1
          const m = d.getUTCMonth()
          let secondary: string | undefined
          if (first || m !== lastMonth) {
            secondary = d.toLocaleString(undefined, { month: 'short', timeZone: 'UTC' })
            lastMonth = m
            first = false
          }
          result.push({
            date: cursor,
            label: d.getUTCDate().toString(),
            level: isMonday ? 'major' : 'minor',
            secondaryLabel: secondary
          })
          cursor += DAY_MS
        }
        break
      }
      case 'week': {
        // Secondary label: year on the first week of each year (or first
        // visible week). Aligns the supra-row with year boundaries.
        const d = new Date(cursor)
        const dow = d.getUTCDay() // 0=Sun
        const offsetToMonday = ((1 - dow) + 7) % 7
        cursor += offsetToMonday * DAY_MS
        let lastYear = -1
        let first = true
        while (cursor <= to) {
          const c = new Date(cursor)
          const isFirstWeekOfMonth = c.getUTCDate() <= 7
          const y = c.getUTCFullYear()
          let secondary: string | undefined
          if (first || y !== lastYear) {
            secondary = String(y)
            lastYear = y
            first = false
          }
          result.push({
            date: cursor,
            label: `W${isoWeekNumber(c)}`,
            level: isFirstWeekOfMonth ? 'major' : 'minor',
            secondaryLabel: secondary
          })
          cursor += 7 * DAY_MS
        }
        break
      }
      case 'month': {
        // Secondary label: year on January (or first visible month). Was
        // entirely missing before — without it, you couldn't tell which year
        // a month belonged to in a multi-year span.
        const start = new Date(cursor)
        let y = start.getUTCFullYear()
        let m = start.getUTCMonth()
        cursor = Date.UTC(y, m, 1)
        let lastYear = -1
        let first = true
        while (cursor <= to) {
          const c = new Date(cursor)
          const yr = c.getUTCFullYear()
          let secondary: string | undefined
          if (first || yr !== lastYear) {
            secondary = String(yr)
            lastYear = yr
            first = false
          }
          result.push({
            date: cursor,
            label: c.toLocaleString(undefined, { month: 'short', timeZone: 'UTC' }),
            level: c.getUTCMonth() === 0 ? 'major' : 'minor',
            secondaryLabel: secondary
          })
          m += 1
          if (m > 11) { m = 0; y += 1 }
          cursor = Date.UTC(y, m, 1)
        }
        break
      }
      case 'quarter': {
        // Split the year out of the primary label and put it on the supra
        // row — previously the label was "Q1 2026" side-by-side, which is
        // visually noisy in a dense Quarter view.
        const start = new Date(cursor)
        let y = start.getUTCFullYear()
        let q = Math.floor(start.getUTCMonth() / 3)
        cursor = Date.UTC(y, q * 3, 1)
        let lastYear = -1
        let first = true
        while (cursor <= to) {
          const c = new Date(cursor)
          const qNum = Math.floor(c.getUTCMonth() / 3) + 1
          const yr = c.getUTCFullYear()
          let secondary: string | undefined
          if (first || yr !== lastYear) {
            secondary = String(yr)
            lastYear = yr
            first = false
          }
          result.push({
            date: cursor,
            label: `Q${qNum}`,
            level: qNum === 1 ? 'major' : 'minor',
            secondaryLabel: secondary
          })
          q += 1
          if (q > 3) { q = 0; y += 1 }
          cursor = Date.UTC(y, q * 3, 1)
        }
        break
      }
    }

    return result
  }

  return { pxPerDay, toX, fromX, ticks }
}

/** ISO 8601 week number for a UTC date. */
function isoWeekNumber (d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * DAY_MS))
}
