//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  dropdownSelectionForPxPerDay,
  visibleDaysFromPxPerDay,
  pxPerDayFromVisibleDays,
  EPSILON_PPD,
  MAX_VISIBLE_DAYS,
  MIN_VISIBLE_DAYS
} from '../zoom-dropdown'
import { ZOOM_PX_PER_DAY, MIN_PPD } from '../zoom'

describe('dropdownSelectionForPxPerDay', () => {
  it('returns the active preset when userPxPerDay is null', () => {
    expect(dropdownSelectionForPxPerDay(null, 'day')).toBe('day')
    expect(dropdownSelectionForPxPerDay(null, 'week')).toBe('week')
    expect(dropdownSelectionForPxPerDay(null, 'month')).toBe('month')
    expect(dropdownSelectionForPxPerDay(null, 'quarter')).toBe('quarter')
  })

  it('returns the matching preset when userPxPerDay equals a preset value', () => {
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.day, 'week')).toBe('day')
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.week, 'day')).toBe('week')
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.month, 'day')).toBe('month')
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.quarter, 'day')).toBe('quarter')
  })

  it('tolerates tiny float-noise within EPSILON_PPD of a preset', () => {
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.day + EPSILON_PPD / 2, 'day')).toBe('day')
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.week - EPSILON_PPD / 2, 'day')).toBe('week')
  })

  it('returns custom for a non-preset userPxPerDay', () => {
    expect(dropdownSelectionForPxPerDay(20, 'day')).toBe('custom')
    expect(dropdownSelectionForPxPerDay(8, 'week')).toBe('custom')
    expect(dropdownSelectionForPxPerDay(0.5, 'quarter')).toBe('custom')
  })

  it('returns custom for values outside the EPSILON_PPD tolerance around a preset', () => {
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.day + 0.5, 'day')).toBe('custom')
    expect(dropdownSelectionForPxPerDay(ZOOM_PX_PER_DAY.week + 0.5, 'week')).toBe('custom')
  })
})

describe('visibleDaysFromPxPerDay', () => {
  it('returns floor of viewport / pxPerDay for typical values', () => {
    expect(visibleDaysFromPxPerDay(1200, 32)).toBe(38) // day preset
    expect(visibleDaysFromPxPerDay(1200, 14)).toBe(86) // week preset
    expect(visibleDaysFromPxPerDay(1200, 4)).toBe(300) // month preset
    expect(visibleDaysFromPxPerDay(1200, 1.5)).toBe(800) // quarter preset
  })

  it('returns at least 1 day', () => {
    expect(visibleDaysFromPxPerDay(10, 1000)).toBe(1)
    expect(visibleDaysFromPxPerDay(0, 32)).toBe(1)
  })

  it('defends against NaN / negative inputs', () => {
    expect(visibleDaysFromPxPerDay(Number.NaN, 32)).toBe(1)
    expect(visibleDaysFromPxPerDay(1200, Number.NaN)).toBe(1)
    expect(visibleDaysFromPxPerDay(1200, 0)).toBe(1)
    expect(visibleDaysFromPxPerDay(1200, -5)).toBe(1)
    expect(visibleDaysFromPxPerDay(-1200, 32)).toBe(1)
  })
})

describe('pxPerDayFromVisibleDays', () => {
  it('inverts visibleDaysFromPxPerDay for round-trip', () => {
    const viewport = 1200
    const days = 60
    const ppd = pxPerDayFromVisibleDays(viewport, days)
    expect(ppd).toBeCloseTo(viewport / days, 5)
    expect(visibleDaysFromPxPerDay(viewport, ppd)).toBe(days)
  })

  it('clamps days to [MIN_VISIBLE_DAYS, MAX_VISIBLE_DAYS]', () => {
    expect(pxPerDayFromVisibleDays(1200, 0)).toBe(1200 / MIN_VISIBLE_DAYS)
    expect(pxPerDayFromVisibleDays(1200, -5)).toBe(1200 / MIN_VISIBLE_DAYS)
    expect(pxPerDayFromVisibleDays(1200, 100000)).toBe(1200 / MAX_VISIBLE_DAYS)
  })

  it('defends against NaN/0 viewport (returns MIN_PPD)', () => {
    expect(pxPerDayFromVisibleDays(0, 60)).toBe(MIN_PPD)
    expect(pxPerDayFromVisibleDays(Number.NaN, 60)).toBe(MIN_PPD)
    expect(pxPerDayFromVisibleDays(-100, 60)).toBe(MIN_PPD)
  })

  it('defends against NaN days (treats as MIN_VISIBLE_DAYS)', () => {
    expect(pxPerDayFromVisibleDays(1200, Number.NaN)).toBe(1200 / MIN_VISIBLE_DAYS)
  })
})
