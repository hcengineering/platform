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

export function createTimeScale (zoom: ZoomLevel, origin: number): TimeScale {
  const pxPerDay = PX_PER_DAY[zoom]
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
        while (cursor <= to) {
          const d = new Date(cursor)
          const isMonday = d.getUTCDay() === 1
          result.push({
            date: cursor,
            label: d.getUTCDate().toString(),
            level: isMonday ? 'major' : 'minor'
          })
          cursor += DAY_MS
        }
        break
      }
      case 'week': {
        const d = new Date(cursor)
        const dow = d.getUTCDay() // 0=Sun
        const offsetToMonday = ((1 - dow) + 7) % 7
        cursor += offsetToMonday * DAY_MS
        while (cursor <= to) {
          const c = new Date(cursor)
          const isFirstWeekOfMonth = c.getUTCDate() <= 7
          result.push({
            date: cursor,
            label: `W${isoWeekNumber(c)}`,
            level: isFirstWeekOfMonth ? 'major' : 'minor'
          })
          cursor += 7 * DAY_MS
        }
        break
      }
      case 'month': {
        const start = new Date(cursor)
        let y = start.getUTCFullYear()
        let m = start.getUTCMonth()
        cursor = Date.UTC(y, m, 1)
        while (cursor <= to) {
          const c = new Date(cursor)
          result.push({
            date: cursor,
            label: c.toLocaleString(undefined, { month: 'short', timeZone: 'UTC' }),
            level: c.getUTCMonth() === 0 ? 'major' : 'minor'
          })
          m += 1
          if (m > 11) { m = 0; y += 1 }
          cursor = Date.UTC(y, m, 1)
        }
        break
      }
      case 'quarter': {
        const start = new Date(cursor)
        let y = start.getUTCFullYear()
        let q = Math.floor(start.getUTCMonth() / 3)
        cursor = Date.UTC(y, q * 3, 1)
        while (cursor <= to) {
          const c = new Date(cursor)
          const qNum = Math.floor(c.getUTCMonth() / 3) + 1
          result.push({
            date: cursor,
            label: `Q${qNum} ${c.getUTCFullYear()}`,
            level: qNum === 1 ? 'major' : 'minor'
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
