//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import {
  DEFAULT_HOURS_PER_DAY,
  getHoursPerDay,
  hoursPerDayUpdate,
  normalizeHoursPerDay,
  splitTime
} from '../working-hours'

describe('normalizeHoursPerDay', () => {
  it('accepts values in (0, 24]', () => {
    expect(normalizeHoursPerDay(6)).toBe(6)
    expect(normalizeHoursPerDay(7.5)).toBe(7.5)
    expect(normalizeHoursPerDay(24)).toBe(24)
  })

  it('treats empty and out-of-range values as not configured', () => {
    expect(normalizeHoursPerDay(undefined)).toBeUndefined()
    expect(normalizeHoursPerDay(null)).toBeUndefined()
    expect(normalizeHoursPerDay(0)).toBeUndefined()
    expect(normalizeHoursPerDay(-1)).toBeUndefined()
    expect(normalizeHoursPerDay(25)).toBeUndefined()
    expect(normalizeHoursPerDay(NaN)).toBeUndefined()
  })
})

describe('getHoursPerDay', () => {
  it('falls back to 8 hours', () => {
    expect(DEFAULT_HOURS_PER_DAY).toBe(8)
    expect(getHoursPerDay(undefined)).toBe(8)
    expect(getHoursPerDay({})).toBe(8)
    expect(getHoursPerDay({ hoursPerDay: 0 })).toBe(8)
  })

  it('uses the project setting', () => {
    expect(getHoursPerDay({ hoursPerDay: 6 })).toBe(6)
  })
})

describe('splitTime', () => {
  it('keeps the legacy 8-hour day by default', () => {
    expect(splitTime(12)).toEqual({ days: 1, hours: 4, minutes: 0 })
    expect(splitTime(1.5)).toEqual({ days: 0, hours: 1, minutes: 30 })
    expect(splitTime(16.25)).toEqual({ days: 2, hours: 0, minutes: 15 })
  })

  it('uses the configured day length', () => {
    expect(splitTime(12, 6)).toEqual({ days: 2, hours: 0, minutes: 0 })
    expect(splitTime(12, 24)).toEqual({ days: 0, hours: 12, minutes: 0 })
    expect(splitTime(24, 24)).toEqual({ days: 1, hours: 0, minutes: 0 })
  })

  it('supports fractional day lengths', () => {
    expect(splitTime(15, 7.5)).toEqual({ days: 2, hours: 0, minutes: 0 })
    expect(splitTime(10, 7.5)).toEqual({ days: 1, hours: 2, minutes: 30 })
  })

  it('rounds to whole minutes without producing 60 minutes', () => {
    expect(splitTime(0.999)).toEqual({ days: 0, hours: 1, minutes: 0 })
    expect(splitTime(7.9999)).toEqual({ days: 1, hours: 0, minutes: 0 })
    expect(splitTime(1 / 15)).toEqual({ days: 0, hours: 0, minutes: 4 })
  })

  it('returns zero for empty or negative values', () => {
    expect(splitTime(0)).toEqual({ days: 0, hours: 0, minutes: 0 })
    expect(splitTime(-3)).toEqual({ days: 0, hours: 0, minutes: 0 })
    expect(splitTime(NaN)).toEqual({ days: 0, hours: 0, minutes: 0 })
  })

  it('ignores an invalid day length', () => {
    expect(splitTime(12, 0)).toEqual({ days: 1, hours: 4, minutes: 0 })
  })
})

describe('hoursPerDayUpdate (project dialog persistence)', () => {
  it('is a no-op when nothing changed', () => {
    expect(hoursPerDayUpdate(6, 6)).toBeUndefined()
    expect(hoursPerDayUpdate(undefined, undefined)).toBeUndefined()
    expect(hoursPerDayUpdate(null, undefined)).toBeUndefined()
    expect(hoursPerDayUpdate(0, undefined)).toBeUndefined()
  })

  it('writes a new value', () => {
    expect(hoursPerDayUpdate(6, undefined)).toEqual({ hoursPerDay: 6 })
    expect(hoursPerDayUpdate(7.5, 6)).toEqual({ hoursPerDay: 7.5 })
  })

  it('unsets a cleared value', () => {
    expect(hoursPerDayUpdate(null, 6)).toEqual({ $unset: { hoursPerDay: true } })
    expect(hoursPerDayUpdate(undefined, 6)).toEqual({ $unset: { hoursPerDay: true } })
  })
})
