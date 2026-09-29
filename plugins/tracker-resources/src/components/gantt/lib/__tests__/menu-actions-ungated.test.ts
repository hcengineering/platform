//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { readFileSync } from 'fs'
import { join } from 'path'

// Architectural guard, not a behavioural test: menu-actions.ts writes plain
// user-picked dates and is deliberately NOT calendar-gated (review #10992).
// If calendar arithmetic ever leaks into this module, these assertions fail
// and force the author to adopt the ready-gate + generation guard used by
// GanttView's drag/resize/keyboard mutations.
const src = readFileSync(join(__dirname, '..', 'menu-actions.ts'), 'utf8')

describe('menu-actions stays calendar-independent', () => {
  it('performs no calendar arithmetic', () => {
    expect(src).not.toMatch(
      /addScheduleDays|effectiveCalendar|calendarReady|WorkingCalendar|resolveHrHolidays|CalendarStateMachine/
    )
  })

  it('writes plain day-granular dates only', () => {
    expect(src).toMatch(/snapToUtcMidnight/)
    expect(src).toMatch(/DAY_MS/)
  })

  it('documents the intentionally-ungated decision', () => {
    expect(src).toMatch(/Intentionally NOT calendar-gated/)
  })
})
