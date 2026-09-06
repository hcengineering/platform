//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { type Ref } from '@hcengineering/core'
import { type Department } from '@hcengineering/hr'
import { type WorkingDaysConfig } from '@hcengineering/tracker'
import {
  DEFAULT_WEEKDAY_MASK,
  applyDepartmentSelection,
  departmentItems,
  enableWorkingDays,
  isLastActiveWeekday,
  isWeekdayActive,
  toggleWeekdayBit,
  workingDaysUpdate
} from '../working-days-editor'

const head = 'head' as Ref<Department>

function dept (id: string, name: string): Department {
  return { _id: id, name } as unknown as Department
}

describe('weekday mask helpers', () => {
  it('defaults to Mon-Fri (bit 0 = Mon … bit 6 = Sun)', () => {
    expect(DEFAULT_WEEKDAY_MASK).toBe(0b0011111)
  })

  it('reports active weekdays', () => {
    expect(isWeekdayActive(0b0011111, 0)).toBe(true) // Mon
    expect(isWeekdayActive(0b0011111, 5)).toBe(false) // Sat
  })

  it('toggles a weekday bit on and off', () => {
    expect(toggleWeekdayBit(0b0011111, 5)).toBe(0b0111111) // + Sat
    expect(toggleWeekdayBit(0b0111111, 5)).toBe(0b0011111) // - Sat
  })

  it('refuses to clear the last active day (at least one working day must stay)', () => {
    expect(toggleWeekdayBit(1 << 3, 3)).toBe(1 << 3)
  })

  it('flags exactly the last active day for the disabled-state of its toggle', () => {
    expect(isLastActiveWeekday(1 << 3, 3)).toBe(true)
    expect(isLastActiveWeekday(0b0000011, 0)).toBe(false)
  })
})

describe('departmentItems', () => {
  it('excludes the root department (represented by the company-wide entry) and sorts by name', () => {
    const items = departmentItems([dept('head', 'Company'), dept('b', 'Backend'), dept('a', 'Assembly')], head)
    expect(items).toEqual([
      { id: 'a', label: 'Assembly' },
      { id: 'b', label: 'Backend' }
    ])
  })

  it('returns [] for no departments', () => {
    expect(departmentItems([], head)).toEqual([])
  })
})

describe('enableWorkingDays', () => {
  it('starts from the Mon-Fri default when enabled', () => {
    expect(enableWorkingDays(true)).toEqual({ weekdayMask: DEFAULT_WEEKDAY_MASK })
  })

  it('returns undefined when disabled (legacy mode)', () => {
    expect(enableWorkingDays(false)).toBeUndefined()
  })
})

describe('applyDepartmentSelection', () => {
  const base: WorkingDaysConfig = { weekdayMask: DEFAULT_WEEKDAY_MASK }

  it('sets the selected department ref', () => {
    expect(applyDepartmentSelection(base, 'team', '#company-wide')).toEqual({
      weekdayMask: DEFAULT_WEEKDAY_MASK,
      holidayDepartment: 'team'
    })
  })

  it('REMOVES the key on company-wide — no `undefined`-valued key left behind', () => {
    const withDept = applyDepartmentSelection(base, 'team', '#company-wide')
    const back = applyDepartmentSelection(withDept, '#company-wide', '#company-wide')
    expect('holidayDepartment' in back).toBe(false)
    expect(back).toEqual({ weekdayMask: DEFAULT_WEEKDAY_MASK })
  })
})

describe('workingDaysUpdate (host dialog persistence)', () => {
  const cfg: WorkingDaysConfig = { weekdayMask: 31 }

  it('returns undefined when nothing changed (value equality, not identity)', () => {
    expect(workingDaysUpdate({ ...cfg }, cfg)).toBeUndefined()
    expect(workingDaysUpdate(undefined, undefined)).toBeUndefined()
  })

  it('enable: writes the full config', () => {
    expect(workingDaysUpdate(cfg, undefined)).toEqual({ workingDaysConfig: cfg })
  })

  it('disable: $unsets the field instead of writing undefined', () => {
    expect(workingDaysUpdate(undefined, cfg)).toEqual({ $unset: { workingDaysConfig: true } })
  })

  it('department change: writes the full config including the ref', () => {
    const next = { ...cfg, holidayDepartment: 'team' } as unknown as WorkingDaysConfig
    expect(workingDaysUpdate(next, cfg)).toEqual({ workingDaysConfig: next })
  })
})
