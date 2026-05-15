//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  isWorkingDay,
  nextWorkingDay,
  addWorkingDays,
  workingDaysBetween,
  fsAnchor,
  ssAnchor,
  ffAnchor,
  sfAnchor,
  fsReverseAnchor,
  ssReverseAnchor,
  ffReverseAnchor,
  sfReverseAnchor
} from '../working-days'
import type { WorkingDaysConfig } from '@hcengineering/tracker'

const DAY_MS = 86_400_000

// Calendar anchors used across the suite — UTC 2026-05 week:
//   Mon May 18 .. Mon May 25
const MON = Date.UTC(2026, 4, 18)
const TUE = Date.UTC(2026, 4, 19)
const WED = Date.UTC(2026, 4, 20)
const FRI = Date.UTC(2026, 4, 22)
const SAT = Date.UTC(2026, 4, 23)
const SUN = Date.UTC(2026, 4, 24)
const MON2 = Date.UTC(2026, 4, 25)

const cfgMonFri: WorkingDaysConfig = { weekdayMask: 0b0011111, holidays: [] }
const cfgAllDays: WorkingDaysConfig = { weekdayMask: 0b1111111, holidays: [] }
const cfgEmpty: WorkingDaysConfig = { weekdayMask: 0, holidays: [] }

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
    const cfg: WorkingDaysConfig = { weekdayMask: 0b0011111, holidays: [MON, TUE] }
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
    const cfg: WorkingDaysConfig = { weekdayMask: 0b0011111, holidays: [WED] }
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
    const cfg: WorkingDaysConfig = { weekdayMask: 0b0011111, holidays: [WED] }
    expect(workingDaysBetween(MON, FRI, cfg)).toBe(4)
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
