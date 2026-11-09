//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { type Ref } from '@hcengineering/core'
import { type Department, type PublicHoliday } from '@hcengineering/hr'
import { resolveHolidayScope, resolveHrHolidays, tzDateToUtcMidnight } from '../hr-holidays'

// The company-root department id. Passed as a parameter (the resolver never
// imports the hr plugin default — types only), so the tests can use a plain
// string ref.
const head = 'head' as Ref<Department>

// Only `_id` and `parent` matter to the scope walk — fabricate minimal docs.
function dept (id: string, parent?: string): Department {
  return { _id: id, parent } as unknown as Department
}

function deptMap (...docs: Department[]): Map<Ref<Department>, Department> {
  return new Map(docs.map((d) => [d._id, d]))
}

// Only `date` and `department` matter to the resolver.
function holiday (year: number, month: number, day: number, department: string): PublicHoliday {
  return { date: { year, month, day, offset: 0 }, department } as unknown as PublicHoliday
}

const ref = (id: string): Ref<Department> => id as Ref<Department>

describe('tzDateToUtcMidnight', () => {
  it('maps a TzDate to the UTC midnight of that calendar day', () => {
    // 19 May 2026 — month is 0-based in TzDate (JS Date convention).
    expect(tzDateToUtcMidnight({ year: 2026, month: 4, day: 19, offset: 0 })).toBe(Date.UTC(2026, 4, 19))
  })

  it('ignores the tz offset field (calendar-day semantics)', () => {
    expect(tzDateToUtcMidnight({ year: 2026, month: 0, day: 1, offset: -720 })).toBe(Date.UTC(2026, 0, 1))
  })
})

describe('resolveHolidayScope', () => {
  // Mirrors hr-resources ScheduleView.getDepartmentHolidays: a department's
  // holidays = its own + those of ALL ancestors up to the company root.
  const tree = deptMap(dept('head'), dept('sub', 'head'), dept('team', 'sub'), dept('other', 'head'))

  it('falls back to the company root when no department is configured', () => {
    expect(resolveHolidayScope(undefined, head, tree)).toEqual(new Set([head]))
  })

  it('falls back to the company root for a deleted/unknown department ref', () => {
    // NEVER union-of-all: an invalid ref must not widen the scope.
    expect(resolveHolidayScope(ref('gone'), head, tree)).toEqual(new Set([head]))
  })

  it('contains the department itself, all ancestors and the root', () => {
    expect(resolveHolidayScope(ref('team'), head, tree)).toEqual(new Set([ref('team'), ref('sub'), head]))
  })

  it('does not include sibling departments', () => {
    expect(resolveHolidayScope(ref('sub'), head, tree).has(ref('other'))).toBe(false)
  })

  it('resolves the root itself to just the root', () => {
    expect(resolveHolidayScope(head, head, tree)).toEqual(new Set([head]))
  })

  it('terminates on a cyclic parent chain and keeps the root fallback', () => {
    const cyclic = deptMap(dept('head'), dept('a', 'b'), dept('b', 'a'))
    const scope = resolveHolidayScope(ref('a'), head, cyclic)
    expect(scope.has(head)).toBe(true)
    expect(scope.has(ref('a'))).toBe(true)
    expect(scope.has(ref('b'))).toBe(true)
  })

  it('terminates on a missing parent doc and keeps the root fallback', () => {
    const broken = deptMap(dept('head'), dept('a', 'ghost'))
    const scope = resolveHolidayScope(ref('a'), head, broken)
    expect(scope.has(head)).toBe(true)
    expect(scope.has(ref('a'))).toBe(true)
  })
})

describe('resolveHrHolidays', () => {
  const scope = new Set<Ref<Department>>([ref('team'), ref('sub'), head])

  it('keeps holidays of the own department and of ancestors, excludes foreign ones', () => {
    const res = resolveHrHolidays(
      [
        holiday(2026, 11, 24, 'team'), // own
        holiday(2026, 11, 25, 'sub'), // ancestor
        holiday(2026, 11, 26, 'head'), // root
        holiday(2026, 11, 27, 'other') // foreign — must be excluded
      ],
      scope
    )
    const byValue = (a: number, b: number): number => a - b
    expect(res.sort(byValue)).toEqual(
      [Date.UTC(2026, 11, 24), Date.UTC(2026, 11, 25), Date.UTC(2026, 11, 26)].sort(byValue)
    )
  })

  it('de-duplicates same-day entries across scoped departments', () => {
    const res = resolveHrHolidays([holiday(2026, 11, 25, 'team'), holiday(2026, 11, 25, 'head')], scope)
    expect(res).toEqual([Date.UTC(2026, 11, 25)])
  })

  it('returns [] for no holidays', () => {
    expect(resolveHrHolidays([], scope)).toEqual([])
  })

  it('returns [] when nothing matches the scope', () => {
    expect(resolveHrHolidays([holiday(2026, 11, 25, 'other')], scope)).toEqual([])
  })
})
