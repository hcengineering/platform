//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  adaptiveWheelFactor,
  applyWheelZoom,
  clampPxPerDay,
  cursorAnchoredScrollLeft,
  MAX_PPD,
  MIN_PPD,
  presetForPxPerDay,
  pxPerDayToTickZoom,
  ZOOM_PX_PER_DAY
} from '../zoom'

describe('clampPxPerDay', () => {
  it('passes valid values through', () => {
    expect(clampPxPerDay(10)).toBe(10)
    expect(clampPxPerDay(MIN_PPD)).toBe(MIN_PPD)
    expect(clampPxPerDay(MAX_PPD)).toBe(MAX_PPD)
  })

  it('clamps too-small values', () => {
    expect(clampPxPerDay(0.001)).toBe(MIN_PPD)
    expect(clampPxPerDay(0)).toBe(MIN_PPD)
  })

  it('clamps too-large values', () => {
    expect(clampPxPerDay(1000)).toBe(MAX_PPD)
  })

  it('rejects NaN / Infinity / negative', () => {
    expect(clampPxPerDay(Number.NaN)).toBe(MIN_PPD)
    expect(clampPxPerDay(Number.POSITIVE_INFINITY)).toBe(MAX_PPD)
    expect(clampPxPerDay(-5)).toBe(MIN_PPD)
  })
})

describe('applyWheelZoom', () => {
  it('zero deltaY is a no-op', () => {
    expect(applyWheelZoom(10, 0)).toBe(10)
  })

  it('negative deltaY zooms in (px/day grows)', () => {
    expect(applyWheelZoom(10, -100)).toBeGreaterThan(10)
  })

  it('positive deltaY zooms out (px/day shrinks)', () => {
    expect(applyWheelZoom(10, 100)).toBeLessThan(10)
  })

  it('two opposite steps return to (approximately) start', () => {
    const start = 14
    const stepUp = applyWheelZoom(start, -100)
    const round = applyWheelZoom(stepUp, 100)
    expect(round).toBeCloseTo(start, 5)
  })

  it('clamps result at MAX_PPD when zooming in hard', () => {
    expect(applyWheelZoom(180, -10000)).toBe(MAX_PPD)
  })

  it('clamps result at MIN_PPD when zooming out hard', () => {
    expect(applyWheelZoom(1, 100000)).toBe(MIN_PPD)
  })

  it('multiplies exponentially: equal deltas multiply by equal factors', () => {
    const a = applyWheelZoom(10, -100)
    const b = applyWheelZoom(20, -100)
    expect(a / 10).toBeCloseTo(b / 20, 5)
  })
})

describe('cursorAnchoredScrollLeft', () => {
  it('keeps the date under the cursor anchored after zoom-in', () => {
    // World-x for the date under cursor before zoom:
    //   xWorld = (scrollLeft + cursorX) / oldPpd
    // After cursor-anchored zoom, the new scrollLeft must satisfy:
    //   (newScrollLeft + cursorX) / newPpd === xWorld
    const oldScrollLeft = 100
    const cursorX = 300
    const oldPpd = 10
    const newPpd = 20

    const newScrollLeft = cursorAnchoredScrollLeft(cursorX, oldScrollLeft, oldPpd, newPpd)
    const xWorldOld = (oldScrollLeft + cursorX) / oldPpd
    const xWorldNew = (newScrollLeft + cursorX) / newPpd
    expect(xWorldNew).toBeCloseTo(xWorldOld, 6)
  })

  it('keeps the date under the cursor anchored after zoom-out', () => {
    const oldScrollLeft = 5000
    const cursorX = 600
    const oldPpd = 32
    const newPpd = 8

    const newScrollLeft = cursorAnchoredScrollLeft(cursorX, oldScrollLeft, oldPpd, newPpd)
    const xWorldOld = (oldScrollLeft + cursorX) / oldPpd
    const xWorldNew = (newScrollLeft + cursorX) / newPpd
    expect(xWorldNew).toBeCloseTo(xWorldOld, 6)
  })

  it('clamps scrollLeft at 0 (no scrolling past start)', () => {
    const result = cursorAnchoredScrollLeft(50, 0, 32, 4)
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('returns original when oldPpd is invalid', () => {
    expect(cursorAnchoredScrollLeft(100, 200, 0, 10)).toBe(200)
    expect(cursorAnchoredScrollLeft(100, 200, Number.NaN, 10)).toBe(200)
  })

  it('returns original when newPpd is invalid', () => {
    expect(cursorAnchoredScrollLeft(100, 200, 10, 0)).toBe(200)
    expect(cursorAnchoredScrollLeft(100, 200, 10, Number.NaN)).toBe(200)
  })
})

describe('pxPerDayToTickZoom', () => {
  it('returns day at preset day-pxPerDay', () => {
    expect(pxPerDayToTickZoom(ZOOM_PX_PER_DAY.day)).toBe('day')
    expect(pxPerDayToTickZoom(50)).toBe('day')
  })

  it('returns week at preset week-pxPerDay', () => {
    expect(pxPerDayToTickZoom(ZOOM_PX_PER_DAY.week)).toBe('week')
    expect(pxPerDayToTickZoom(10)).toBe('week')
  })

  it('returns month at preset month-pxPerDay', () => {
    expect(pxPerDayToTickZoom(ZOOM_PX_PER_DAY.month)).toBe('month')
    expect(pxPerDayToTickZoom(3)).toBe('month')
  })

  it('returns quarter at preset quarter-pxPerDay', () => {
    expect(pxPerDayToTickZoom(ZOOM_PX_PER_DAY.quarter)).toBe('quarter')
    expect(pxPerDayToTickZoom(0.5)).toBe('quarter')
    expect(pxPerDayToTickZoom(0.1)).toBe('quarter')
  })

  it('handles invalid values gracefully (returns quarter)', () => {
    expect(pxPerDayToTickZoom(0)).toBe('quarter')
    expect(pxPerDayToTickZoom(-1)).toBe('quarter')
    expect(pxPerDayToTickZoom(Number.NaN)).toBe('quarter')
  })

  it('boundaries: > 20 → day, == 20 → week', () => {
    expect(pxPerDayToTickZoom(20.01)).toBe('day')
    expect(pxPerDayToTickZoom(20)).toBe('week')
  })

  it('boundaries: > 7 → week, == 7 → month', () => {
    expect(pxPerDayToTickZoom(7.01)).toBe('week')
    expect(pxPerDayToTickZoom(7)).toBe('month')
  })

  it('boundaries: > 2 → month, == 2 → quarter', () => {
    expect(pxPerDayToTickZoom(2.01)).toBe('month')
    expect(pxPerDayToTickZoom(2)).toBe('quarter')
  })
})

describe('presetForPxPerDay', () => {
  it('mirrors pxPerDayToTickZoom for toolbar highlight', () => {
    expect(presetForPxPerDay(32)).toBe('day')
    expect(presetForPxPerDay(14)).toBe('week')
    expect(presetForPxPerDay(4)).toBe('month')
    expect(presetForPxPerDay(1.5)).toBe('quarter')
  })
})

describe('adaptiveWheelFactor', () => {
  it('uses 0.006 for week and day densities (>= 4 ppd)', () => {
    expect(adaptiveWheelFactor(32)).toBe(0.006) // day preset
    expect(adaptiveWheelFactor(14)).toBe(0.006) // week preset
    expect(adaptiveWheelFactor(4)).toBe(0.006) // month preset boundary
  })

  it('uses 0.012 for month and quarter densities (< 4 ppd)', () => {
    expect(adaptiveWheelFactor(3.99)).toBe(0.012) // just under boundary
    expect(adaptiveWheelFactor(1.5)).toBe(0.012) // quarter preset
    expect(adaptiveWheelFactor(0.1)).toBe(0.012) // very low density
  })

  it('defaults to 0.012 on invalid input', () => {
    expect(adaptiveWheelFactor(0)).toBe(0.012)
    expect(adaptiveWheelFactor(-5)).toBe(0.012)
    expect(adaptiveWheelFactor(Number.NaN)).toBe(0.012)
  })

  it('makes low-density zoom subjectively faster than fixed 0.006 would', () => {
    // One wheel notch (deltaY=100) at quarter density (ppd=1.5):
    //   fixed 0.006: ppd * exp(-0.6) ≈ ppd * 0.549  → ~45 % zoom-out
    //   adaptive 0.012: ppd * exp(-1.2) ≈ ppd * 0.301 → ~70 % zoom-out
    const oldPpd = 1.5
    const fixed = applyWheelZoom(oldPpd, 100, 0.006)
    const adaptive = applyWheelZoom(oldPpd, 100) // adaptive default
    expect(adaptive).toBeLessThan(fixed)
  })

  it('produces same zoom in high-density (week=14)', () => {
    // Adaptive factor for ppd=14 is 0.006, identical to the v121.13 fixed value
    const adaptive = applyWheelZoom(14, 100)
    const fixed = applyWheelZoom(14, 100, 0.006)
    expect(adaptive).toBe(fixed)
  })
})
