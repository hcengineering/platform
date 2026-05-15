//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  computeAdaptivePxPerDay,
  computeCanvasRenderWidth,
  computeCanvasViewportWidth,
  computeTickViewport,
  nonWorkingDaysInRange
} from '../viewport'
import type { WorkingDaysConfig } from '@hcengineering/tracker'

describe('viewport', () => {
  it('subtracts the sticky sidebar and resize cell from the visible canvas width', () => {
    expect(computeCanvasViewportWidth(873, 280, 5)).toBe(588)
    expect(computeCanvasViewportWidth(433, 280, 5)).toBe(148)
  })

  it('never returns zero or negative width', () => {
    expect(computeCanvasViewportWidth(100, 280, 5)).toBe(1)
  })

  it('fills the visible canvas when the data range is narrower than the viewport', () => {
    expect(computeCanvasRenderWidth(480, 900)).toBe(900)
    expect(computeCanvasRenderWidth(1400, 900)).toBe(1400)
  })

  it('clamps header and grid tick generation to the data range', () => {
    expect(computeTickViewport(0, 1600, 900)).toEqual({ left: 0, right: 900 })
    expect(computeTickViewport(500, 1600, 900)).toEqual({ left: 400, right: 900 })
  })

  it('stretches time columns when the data range is narrower than the viewport', () => {
    expect(computeAdaptivePxPerDay(1.5, 600, 900)).toBeCloseTo(2.25)
    expect(computeAdaptivePxPerDay(1.5, 1200, 900)).toBe(1.5)
  })
})

describe('nonWorkingDaysInRange', () => {
  const cfgMonFri: WorkingDaysConfig = { weekdayMask: 0b0011111, holidays: [] }

  it('returns an empty array when cfg is undefined (legacy mode)', () => {
    expect(nonWorkingDaysInRange(Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 25), undefined)).toEqual([])
  })

  it('lists Saturday and Sunday for a Mon..next-Mon range under Mon-Fri', () => {
    const res = nonWorkingDaysInRange(Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 25), cfgMonFri)
    expect(res).toEqual([Date.UTC(2026, 4, 23), Date.UTC(2026, 4, 24)])
  })

  it('respects the maxDays cap', () => {
    const res = nonWorkingDaysInRange(
      Date.UTC(2026, 0, 1),
      Date.UTC(2030, 0, 1),
      cfgMonFri,
      10
    )
    expect(res.length).toBeLessThanOrEqual(10)
  })

  it('handles inverted ranges (from > to) by normalising', () => {
    const res = nonWorkingDaysInRange(Date.UTC(2026, 4, 25), Date.UTC(2026, 4, 18), cfgMonFri)
    expect(res).toEqual([Date.UTC(2026, 4, 23), Date.UTC(2026, 4, 24)])
  })

  it('includes a holiday as a non-working day', () => {
    const cfg: WorkingDaysConfig = { weekdayMask: 0b0011111, holidays: [Date.UTC(2026, 4, 20)] }
    const res = nonWorkingDaysInRange(Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 22), cfg)
    expect(res).toEqual([Date.UTC(2026, 4, 20)])
  })
})
