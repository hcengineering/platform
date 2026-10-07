//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  isWorkingDay,
  findWorkingDay,
  nextWorkingDay,
  prevWorkingDay,
  addWorkingDays,
  workingDaysBetween,
  workingDayDelta,
  utcMidnight,
  fsAnchor,
  ssAnchor,
  ffAnchor,
  sfAnchor,
  fsReverseAnchor,
  ssReverseAnchor,
  ffReverseAnchor,
  sfReverseAnchor,
  workingDaySpan,
  dueForSpan,
  startForSpan,
  workingDaysPerWeek,
  MAX_WORKING_SPAN_DAYS
} from '../working-days'
import type { WorkingCalendar } from '../types'

const DAY_MS = 86_400_000

// Calendar anchors used across the suite — UTC 2026-05 week:
//   Mon May 18 .. Mon May 25
const MON = Date.UTC(2026, 4, 18)
const TUE = Date.UTC(2026, 4, 19)
const WED = Date.UTC(2026, 4, 20)
const THU = Date.UTC(2026, 4, 21)
const FRI = Date.UTC(2026, 4, 22)
const SAT = Date.UTC(2026, 4, 23)
const SUN = Date.UTC(2026, 4, 24)
const MON2 = Date.UTC(2026, 4, 25)

const cfgMonFri: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [] }
const cfgAllDays: WorkingCalendar = { weekdayMask: 0b1111111, holidays: [] }
const cfgEmpty: WorkingCalendar = { weekdayMask: 0, holidays: [] }

describe('isWorkingDay', () => {
  it('Monday is a working day under Mon-Fri', () => {
    expect(isWorkingDay(MON, cfgMonFri)).toBe(true)
  })

  it('Friday is a working day under Mon-Fri', () => {
    expect(isWorkingDay(FRI, cfgMonFri)).toBe(true)
  })

  it('Saturday is not a working day under Mon-Fri', () => {
    expect(isWorkingDay(SAT, cfgMonFri)).toBe(false)
  })

  it('Sunday is not a working day under Mon-Fri', () => {
    expect(isWorkingDay(SUN, cfgMonFri)).toBe(false)
  })

  it('Saturday is a working day when bit 5 is set', () => {
    expect(isWorkingDay(SAT, { weekdayMask: 0b0111111, holidays: [] })).toBe(true)
  })

  it('Sunday is a working day when bit 6 is set', () => {
    expect(isWorkingDay(SUN, { weekdayMask: 0b1111111, holidays: [] })).toBe(true)
  })

  it('respects holiday entries', () => {
    expect(isWorkingDay(MON, { weekdayMask: 0b0011111, holidays: [MON] })).toBe(false)
  })

  it('rounds the input to UTC midnight before evaluating', () => {
    // Half a day past Monday is still Monday.
    expect(isWorkingDay(MON + DAY_MS / 2, cfgMonFri)).toBe(true)
  })

  it('matches a holiday entry that is not midnight-aligned', () => {
    expect(isWorkingDay(MON, { weekdayMask: 0b0011111, holidays: [MON + 12 * 3600_000] })).toBe(false)
  })

  it('an empty mask treats every day as non-working', () => {
    expect(isWorkingDay(MON, cfgEmpty)).toBe(false)
    expect(isWorkingDay(WED, cfgEmpty)).toBe(false)
  })
})

describe('nextWorkingDay', () => {
  it('returns the input if it is already a working day', () => {
    expect(nextWorkingDay(MON, cfgMonFri)).toBe(MON)
  })

  it('skips Saturday → Monday', () => {
    expect(nextWorkingDay(SAT, cfgMonFri)).toBe(MON2)
  })

  it('skips Sunday → Monday', () => {
    expect(nextWorkingDay(SUN, cfgMonFri)).toBe(MON2)
  })

  it('skips configured holidays', () => {
    const cfg: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [MON, TUE] }
    expect(nextWorkingDay(MON, cfg)).toBe(WED)
  })

  it('returns the input midnight unchanged after 60 fruitless iterations', () => {
    // No working days configured anywhere — safety bail returns input midnight.
    expect(nextWorkingDay(MON, cfgEmpty)).toBe(MON)
  })
})

describe('addWorkingDays', () => {
  it('Friday + 1 working day = next Monday', () => {
    expect(addWorkingDays(FRI, 1, cfgMonFri)).toBe(MON2)
  })

  it('Monday + 0 working days = Monday (no auto-snap)', () => {
    expect(addWorkingDays(MON, 0, cfgMonFri)).toBe(MON)
  })

  it('Saturday + 0 working days = Saturday (preserves user-pinned non-working date)', () => {
    expect(addWorkingDays(SAT, 0, cfgMonFri)).toBe(SAT)
  })

  it('Monday + 5 working days = next Monday (one full work-week)', () => {
    expect(addWorkingDays(MON, 5, cfgMonFri)).toBe(MON2)
  })

  it('Friday + 5 working days = Friday in week after next', () => {
    expect(addWorkingDays(FRI, 5, cfgMonFri)).toBe(Date.UTC(2026, 4, 29))
  })

  it('Monday - 1 working day = previous Friday', () => {
    expect(addWorkingDays(MON, -1, cfgMonFri)).toBe(Date.UTC(2026, 4, 15))
  })

  it('handles a holiday in the middle of the span', () => {
    // Mon-Fri active, but Wed is a holiday.
    // Mon + 3 wd should land on Fri (skipping the holiday).
    const cfg: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [WED] }
    expect(addWorkingDays(MON, 3, cfg)).toBe(FRI)
  })

  it('all-days-active: addWorkingDays equals calendar arithmetic', () => {
    expect(addWorkingDays(MON, 7, cfgAllDays)).toBe(MON + 7 * DAY_MS)
  })

  it('negative across a weekend: Tuesday - 2 wd = previous Friday', () => {
    expect(addWorkingDays(TUE, -2, cfgMonFri)).toBe(Date.UTC(2026, 4, 15))
  })
})

describe('workingDaysBetween', () => {
  it('inclusive of both endpoints — Mon..Fri = 5', () => {
    expect(workingDaysBetween(MON, FRI, cfgMonFri)).toBe(5)
  })

  it('skips a weekend — Fri..next Mon = 2 (Fri + Mon)', () => {
    expect(workingDaysBetween(FRI, MON2, cfgMonFri)).toBe(2)
  })

  it('returns a negative count when a > b (mirroring addWorkingDays semantics)', () => {
    expect(workingDaysBetween(FRI, MON, cfgMonFri)).toBe(-5)
  })

  it('returns 1 for the same working day at both endpoints', () => {
    expect(workingDaysBetween(MON, MON, cfgMonFri)).toBe(1)
  })

  it('returns 0 for the same non-working day at both endpoints', () => {
    expect(workingDaysBetween(SAT, SAT, cfgMonFri)).toBe(0)
  })

  it('counts a holiday as non-working', () => {
    const cfg: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [WED] }
    expect(workingDaysBetween(MON, FRI, cfg)).toBe(4)
  })
})

describe('workingDayDelta', () => {
  it('Friday → next Monday = 1 working-day step (weekend skipped)', () => {
    expect(workingDayDelta(FRI, MON2, cfgMonFri)).toBe(1)
  })

  it('Monday → previous Friday = -1 (signed, mirrored)', () => {
    expect(workingDayDelta(MON2, FRI, cfgMonFri)).toBe(-1)
  })

  it('same working day at both endpoints = 0', () => {
    expect(workingDayDelta(MON, MON, cfgMonFri)).toBe(0)
  })

  it('same non-working day (Saturday) at both endpoints = 0', () => {
    expect(workingDayDelta(SAT, SAT, cfgMonFri)).toBe(0)
  })

  it('non-working start point: Saturday → next Monday = 1 (from excluded, to included)', () => {
    expect(workingDayDelta(SAT, MON2, cfgMonFri)).toBe(1)
  })

  it('holiday in span: Mon → Wed with Tuesday a holiday = 1', () => {
    const cfg: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [TUE] }
    expect(workingDayDelta(MON, WED, cfg)).toBe(1)
  })

  it('normalizes raw time-of-day inputs: Fri 09:00 → next Monday = 1', () => {
    expect(workingDayDelta(FRI + 9 * 3600_000, MON2, cfgMonFri)).toBe(1)
  })

  it('roundtrip invariant: addWorkingDays(from, workingDayDelta(from, to)) === to', () => {
    const pairs: Array<[number, number]> = [
      [MON, FRI],
      [FRI, MON2],
      [MON, MON2],
      [MON2, MON],
      [MON2, FRI]
    ]
    for (const [from, to] of pairs) {
      expect(addWorkingDays(from, workingDayDelta(from, to, cfgMonFri), cfgMonFri)).toBe(to)
    }
  })
})

describe('utcMidnight', () => {
  it('rounds a time-of-day down to its UTC midnight', () => {
    expect(utcMidnight(Date.UTC(2026, 4, 15, 9))).toBe(Date.UTC(2026, 4, 15))
  })

  it('is idempotent on values already at UTC midnight', () => {
    expect(utcMidnight(MON)).toBe(MON)
  })
})

describe('FS/SS/FF/SF anchors — legacy mode (cfg=undefined)', () => {
  it('fsAnchor with lag=0 returns predDue + 1 day (the off-by-one fix)', () => {
    const predDue = Date.UTC(2026, 4, 5)
    expect(fsAnchor(predDue, 0, undefined)).toBe(Date.UTC(2026, 4, 6))
  })

  it('fsAnchor with lag=2 returns predDue + 3 days (1 + lag in calendar days)', () => {
    const predDue = Date.UTC(2026, 4, 5)
    expect(fsAnchor(predDue, 2, undefined)).toBe(Date.UTC(2026, 4, 8))
  })

  it('ssAnchor with lag=0 returns predStart unchanged (same start)', () => {
    const predStart = Date.UTC(2026, 4, 5)
    expect(ssAnchor(predStart, 0, undefined)).toBe(predStart)
  })

  it('ffAnchor with lag=1 adds one calendar day to predDue', () => {
    const predDue = Date.UTC(2026, 4, 5)
    expect(ffAnchor(predDue, 1, undefined)).toBe(Date.UTC(2026, 4, 6))
  })

  it('sfAnchor with lag=0 returns predStart unchanged', () => {
    const predStart = Date.UTC(2026, 4, 5)
    expect(sfAnchor(predStart, 0, undefined)).toBe(predStart)
  })

  it('fsReverseAnchor with lag=0 returns succStart - 1 day', () => {
    const succStart = Date.UTC(2026, 4, 6)
    expect(fsReverseAnchor(succStart, 0, undefined)).toBe(Date.UTC(2026, 4, 5))
  })

  it('ssReverseAnchor mirrors ssAnchor', () => {
    const succStart = Date.UTC(2026, 4, 8)
    expect(ssReverseAnchor(succStart, 3, undefined)).toBe(Date.UTC(2026, 4, 5))
  })

  it('ffReverseAnchor mirrors ffAnchor', () => {
    const succDue = Date.UTC(2026, 4, 6)
    expect(ffReverseAnchor(succDue, 1, undefined)).toBe(Date.UTC(2026, 4, 5))
  })

  it('sfReverseAnchor mirrors sfAnchor', () => {
    const succDue = Date.UTC(2026, 4, 6)
    expect(sfReverseAnchor(succDue, 1, undefined)).toBe(Date.UTC(2026, 4, 5))
  })
})

describe('FS/SS/FF/SF anchors — working-days mode (Mon-Fri)', () => {
  it('fsAnchor skips the weekend: Fri + 1+0 wd = next Monday', () => {
    expect(fsAnchor(FRI, 0, cfgMonFri)).toBe(MON2)
  })

  it('fsAnchor with lag=2 from Friday lands on Wednesday', () => {
    // Fri + (1 + 2) wd = Wed in next week.
    expect(fsAnchor(FRI, 2, cfgMonFri)).toBe(Date.UTC(2026, 4, 27))
  })

  it('ssAnchor with lag=3 from Friday lands on Wednesday next week', () => {
    expect(ssAnchor(FRI, 3, cfgMonFri)).toBe(Date.UTC(2026, 4, 27))
  })

  it('ffAnchor with lag=0 returns predDue unchanged even if predDue is non-working', () => {
    // Predecessor stored with a non-working Due → reverse anchor preserves it.
    expect(ffAnchor(SAT, 0, cfgMonFri)).toBe(SAT)
  })

  it('fsReverseAnchor from Monday + lag=0 lands on the previous Friday', () => {
    expect(fsReverseAnchor(MON2, 0, cfgMonFri)).toBe(FRI)
  })
})

describe('prevWorkingDay', () => {
  it('returns the input midnight when it is a working day', () => {
    expect(prevWorkingDay(MON, cfgMonFri)).toBe(MON)
  })

  it('Saturday rolls back to Friday', () => {
    expect(prevWorkingDay(SAT, cfgMonFri)).toBe(FRI)
  })

  it('Sunday rolls back to Friday', () => {
    expect(prevWorkingDay(SUN, cfgMonFri)).toBe(FRI)
  })

  it('skips a Friday holiday back to Thursday', () => {
    const cfgHolFri: WorkingCalendar = { weekdayMask: 0b0011111, holidays: [FRI] }
    expect(prevWorkingDay(FRI, cfgHolFri)).toBe(THU)
    expect(prevWorkingDay(SUN, cfgHolFri)).toBe(THU)
  })

  it('falls back to the input midnight when no day is a working day', () => {
    expect(prevWorkingDay(SAT + 3 * 3_600_000, cfgEmpty)).toBe(SAT)
  })

  it('normalizes a time-of-day input to UTC midnight', () => {
    expect(prevWorkingDay(SAT + 3 * 3_600_000, cfgMonFri)).toBe(FRI)
  })
})

describe('workingDaySpan', () => {
  it('Mon..Fri is five working days', () => {
    expect(workingDaySpan(MON, FRI, cfgMonFri)).toBe(5)
  })

  it('Fri..Mon spans two working days across the weekend', () => {
    expect(workingDaySpan(FRI, MON2, cfgMonFri)).toBe(2)
  })

  it('a weekend-only bar counts as one working day', () => {
    expect(workingDaySpan(SAT, SUN, cfgMonFri)).toBe(1)
  })

  it('a holiday inside the bar is not counted', () => {
    expect(workingDaySpan(MON, FRI, { weekdayMask: 0b0011111, holidays: [WED] })).toBe(4)
  })

  it('clamps an inverted range to one', () => {
    expect(workingDaySpan(FRI, MON, cfgMonFri)).toBe(1)
  })
})

describe('dueForSpan / startForSpan', () => {
  it('a three-working-day bar starting Thursday ends next Monday', () => {
    expect(dueForSpan(THU, 3, cfgMonFri)).toBe(MON2)
  })

  it('a three-working-day bar ending Monday starts the previous Thursday', () => {
    expect(startForSpan(MON2, 3, cfgMonFri)).toBe(THU)
  })

  it('startForSpan inverts dueForSpan for every weekday start and spans 1..10', () => {
    for (const s of [MON, TUE, WED, THU, FRI]) {
      for (let n = 1; n <= 10; n++) {
        expect(startForSpan(dueForSpan(s, n, cfgMonFri), n, cfgMonFri)).toBe(s)
      }
    }
  })

  it('a span of one or less returns the input unchanged', () => {
    expect(dueForSpan(SAT, 1, cfgMonFri)).toBe(SAT)
    expect(dueForSpan(WED, 0, cfgMonFri)).toBe(WED)
    expect(startForSpan(SUN, 1, cfgMonFri)).toBe(SUN)
    expect(startForSpan(WED, -2, cfgMonFri)).toBe(WED)
  })
})

describe('workingDaysPerWeek', () => {
  it('counts the active weekdays of the mask', () => {
    expect(workingDaysPerWeek({ weekdayMask: 31, holidays: [] })).toBe(5)
    expect(workingDaysPerWeek({ weekdayMask: 63, holidays: [] })).toBe(6)
    expect(workingDaysPerWeek({ weekdayMask: 127, holidays: [] })).toBe(7)
    expect(workingDaysPerWeek({ weekdayMask: 0, holidays: [] })).toBe(0)
  })
})

describe('working-day helpers — degenerate input stays bounded', () => {
  // 70 consecutive holidays from Mon May 18: longer than the 60-day bail.
  const allHolidays: WorkingCalendar = {
    weekdayMask: 0b1111111,
    holidays: Array.from({ length: 70 }, (_, i) => MON + i * DAY_MS)
  }

  it('nextWorkingDay / prevWorkingDay fall back to the input midnight when holidays cover the window', () => {
    expect(nextWorkingDay(MON, allHolidays)).toBe(MON)
    expect(prevWorkingDay(MON + 69 * DAY_MS, allHolidays)).toBe(MON + 69 * DAY_MS)
  })

  it('findWorkingDay reports a failed search instead of a non-working day', () => {
    expect(findWorkingDay(MON, 1, allHolidays)).toBeUndefined()
    expect(findWorkingDay(MON + 69 * DAY_MS, -1, allHolidays)).toBeUndefined()
    expect(findWorkingDay(SAT, 1, cfgEmpty)).toBeUndefined()
    expect(findWorkingDay(NaN, 1, cfgMonFri)).toBeUndefined()
    // Within the window it finds the working day just past the blackout.
    expect(findWorkingDay(MON + 20 * DAY_MS, 1, allHolidays)).toBe(MON + 70 * DAY_MS)
    expect(findWorkingDay(MON + 50 * DAY_MS, -1, allHolidays)).toBe(MON - DAY_MS)
  })

  it('findWorkingDay snaps forward / backward like nextWorkingDay / prevWorkingDay', () => {
    expect(findWorkingDay(SAT + 3 * 3_600_000, 1, cfgMonFri)).toBe(MON2)
    expect(findWorkingDay(SAT + 3 * 3_600_000, -1, cfgMonFri)).toBe(FRI)
    expect(findWorkingDay(WED + 3 * 3_600_000, -1, cfgMonFri)).toBe(WED)
  })

  // No wall-clock assertions: every step of the walk moves the cursor by one
  // calendar day, so the distance of the result from the input is an exact,
  // runner-independent count of the loop iterations.
  it('addWorkingDays caps a huge finite step count at MAX_WORKING_SPAN_DAYS', () => {
    expect(addWorkingDays(MON, Number.MAX_SAFE_INTEGER, cfgAllDays)).toBe(MON + MAX_WORKING_SPAN_DAYS * DAY_MS)
    expect(addWorkingDays(MON, -Number.MAX_SAFE_INTEGER, cfgAllDays)).toBe(MON - MAX_WORKING_SPAN_DAYS * DAY_MS)
    expect(addWorkingDays(MON, Number.MAX_VALUE, cfgMonFri)).toBe(addWorkingDays(MON, MAX_WORKING_SPAN_DAYS, cfgMonFri))
  })

  it('addWorkingDays stops after |n| × 7 + 60 calendar days without working weekdays', () => {
    expect(addWorkingDays(MON, 3, cfgEmpty)).toBe(MON + (3 * 7 + 60) * DAY_MS)
    expect(addWorkingDays(MON, -3, cfgEmpty)).toBe(MON - (3 * 7 + 60) * DAY_MS)
    // A huge step count is capped first, so the walk is bounded by the cap.
    expect(addWorkingDays(MON, 1e15, cfgEmpty)).toBe(MON + (MAX_WORKING_SPAN_DAYS * 7 + 60) * DAY_MS)
    // A holiday blackout is walked through and the remaining steps still count.
    expect(addWorkingDays(MON + 69 * DAY_MS, -10, allHolidays)).toBe(MON - 10 * DAY_MS)
  })

  it('addWorkingDays treats a non-finite step count as zero', () => {
    expect(addWorkingDays(MON, Infinity, cfgMonFri)).toBe(MON)
    expect(addWorkingDays(MON, -Infinity, cfgMonFri)).toBe(MON)
    expect(addWorkingDays(MON, NaN, cfgMonFri)).toBe(MON)
  })

  it('workingDaySpan returns 1 for non-finite or inverted input', () => {
    expect(workingDaySpan(MON, Infinity, cfgMonFri)).toBe(1)
    expect(workingDaySpan(-Infinity, MON, cfgMonFri)).toBe(1)
    expect(workingDaySpan(NaN, MON, cfgMonFri)).toBe(1)
    expect(workingDaySpan(Number.MAX_SAFE_INTEGER, 0, cfgMonFri)).toBe(1)
  })

  it('workingDaySpan counts at most MAX_WORKING_SPAN_DAYS calendar days of a huge range', () => {
    expect(workingDaySpan(0, Number.MAX_SAFE_INTEGER, cfgAllDays)).toBe(MAX_WORKING_SPAN_DAYS)
    expect(workingDaySpan(0, Number.MAX_SAFE_INTEGER, cfgEmpty)).toBe(1)
  })

  it('dueForSpan / startForSpan treat a non-finite span as one day', () => {
    expect(dueForSpan(WED, Infinity, cfgMonFri)).toBe(WED)
    expect(dueForSpan(WED, NaN, cfgMonFri)).toBe(WED)
    expect(startForSpan(WED, Infinity, cfgMonFri)).toBe(WED)
  })

  it('dueForSpan / startForSpan clamp a huge span and terminate without working weekdays', () => {
    expect(dueForSpan(MON, 1e12, cfgAllDays)).toBe(MON + (MAX_WORKING_SPAN_DAYS - 1) * DAY_MS)
    expect(startForSpan(MON, 1e12, cfgAllDays)).toBe(MON - (MAX_WORKING_SPAN_DAYS - 1) * DAY_MS)
    expect(dueForSpan(MON, 1e12, cfgEmpty)).toBe(MON + ((MAX_WORKING_SPAN_DAYS - 1) * 7 + 60) * DAY_MS)
    expect(startForSpan(MON, 3, cfgEmpty)).toBe(MON - (2 * 7 + 60) * DAY_MS)
  })

  it('dueForSpan / startForSpan return a non-finite anchor unchanged', () => {
    expect(dueForSpan(NaN, 3, cfgMonFri)).toBeNaN()
    expect(startForSpan(Infinity, 3, cfgMonFri)).toBe(Infinity)
  })
})
