//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { createTimeScale, snapToUtcMidnight } from '../time-scale'

const DAY_MS = 86_400_000

describe('snapToUtcMidnight', () => {
  it('returns 0 unchanged', () => {
    expect(snapToUtcMidnight(0)).toBe(0)
  })

  it('rounds down to UTC midnight', () => {
    const t = Date.UTC(2026, 4, 15, 17, 30, 45) // 2026-05-15 17:30:45 UTC
    expect(snapToUtcMidnight(t)).toBe(Date.UTC(2026, 4, 15))
  })

  it('is idempotent', () => {
    const t = Date.UTC(2026, 0, 1)
    expect(snapToUtcMidnight(snapToUtcMidnight(t))).toBe(t)
  })
})

describe('createTimeScale', () => {
  const origin = Date.UTC(2026, 0, 1) // 2026-01-01 UTC

  it('week zoom: pxPerDay = 14', () => {
    const ts = createTimeScale('week', origin)
    expect(ts.pxPerDay).toBe(14)
  })

  it('day/month/quarter zoom values match preset', () => {
    expect(createTimeScale('day', origin).pxPerDay).toBe(32)
    expect(createTimeScale('month', origin).pxPerDay).toBe(4)
    expect(createTimeScale('quarter', origin).pxPerDay).toBe(1.5)
  })

  it('supports an adaptive pxPerDay override', () => {
    const ts = createTimeScale('quarter', origin, 2.25)
    expect(ts.pxPerDay).toBe(2.25)
    expect(ts.toX(origin + 10 * DAY_MS)).toBe(22.5)
  })

  it('toX(origin) === 0', () => {
    const ts = createTimeScale('week', origin)
    expect(ts.toX(origin)).toBe(0)
  })

  it('toX(origin + 7d) === 7 * pxPerDay', () => {
    const ts = createTimeScale('week', origin)
    expect(ts.toX(origin + 7 * DAY_MS)).toBe(7 * 14)
  })

  it('fromX is inverse of toX (snapped)', () => {
    const ts = createTimeScale('week', origin)
    const t = origin + 5 * DAY_MS
    expect(ts.fromX(ts.toX(t))).toBe(t)
  })

  it('week zoom emits weekly ticks aligned to Monday', () => {
    const ts = createTimeScale('week', origin)
    const ticks = ts.ticks([origin, origin + 30 * DAY_MS])
    expect(ticks.length).toBeGreaterThanOrEqual(4)
    expect(ticks.length).toBeLessThanOrEqual(6)
    // First tick is the first Monday on or after origin
    expect(ticks[0].date).toBeGreaterThanOrEqual(origin)
    expect(ticks[0].date).toBeLessThan(origin + 7 * DAY_MS)
    // Every tick is on a Monday.
    for (const t of ticks) {
      expect(new Date(t.date).getUTCDay()).toBe(1)
    }
    expect(ticks.every(t => Number.isInteger(t.date))).toBe(true)
  })

  it('all tick dates are UTC midnights', () => {
    const ts = createTimeScale('week', origin)
    const ticks = ts.ticks([origin, origin + 30 * DAY_MS])
    for (const t of ticks) {
      expect(snapToUtcMidnight(t.date)).toBe(t.date)
    }
  })
})

describe('time-scale — secondary label (year/month supra row)', () => {
  const DAY = 86_400_000

  it('day-zoom: secondaryLabel set on 1st of month and on first visible tick', () => {
    const scale = createTimeScale('day', Date.UTC(2026, 0, 1))
    // Span 2 months: Jan 28 – Feb 5
    const ticks = scale.ticks([Date.UTC(2026, 0, 28), Date.UTC(2026, 1, 5)])
    const withSecondary = ticks.filter((t) => t.secondaryLabel !== undefined)
    // Expect: first visible tick (Jan 28) + Feb 1
    expect(withSecondary).toHaveLength(2)
    expect(withSecondary[0].secondaryLabel).toMatch(/jan/i)
    expect(new Date(withSecondary[1].date).getUTCDate()).toBe(1)
    expect(withSecondary[1].secondaryLabel).toMatch(/feb/i)
  })

  it('week-zoom: secondaryLabel = year on first visible week + first week of new year', () => {
    const scale = createTimeScale('week', Date.UTC(2026, 11, 1))
    // Span across the 2026/2027 year boundary
    const ticks = scale.ticks([Date.UTC(2026, 11, 1), Date.UTC(2027, 0, 31)])
    const withSecondary = ticks.filter((t) => t.secondaryLabel !== undefined)
    expect(withSecondary.length).toBeGreaterThanOrEqual(2)
    expect(withSecondary[0].secondaryLabel).toBe('2026')
    expect(withSecondary[1].secondaryLabel).toBe('2027')
  })

  it('quarter-zoom: label is "Qn" only, year goes to secondaryLabel', () => {
    const scale = createTimeScale('quarter', Date.UTC(2026, 0, 1))
    const ticks = scale.ticks([Date.UTC(2026, 0, 1), Date.UTC(2026, 11, 31)])
    expect(ticks.map((t) => t.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    expect(ticks[0].secondaryLabel).toBe('2026')
    expect(ticks[1].secondaryLabel).toBeUndefined() // Q2 same year
    void DAY
  })
})
