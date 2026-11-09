//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DragTarget, GanttDependency, GanttItem, WorkingCalendar } from '../types'

it('accepts a structural tracker-like target without importing tracker', () => {
  const item: GanttItem = { _id: 'ISSUE-1' }
  const target: DragTarget = { kind: 'issue', doc: item }
  expect(target.doc._id).toBe('ISSUE-1')
  const cal: WorkingCalendar = { weekdayMask: 31, holidays: [] }
  expect(cal.weekdayMask).toBe(31)
})

it('models a neutral scheduling dependency', () => {
  const dep: GanttDependency = { _id: 'REL-1', fromId: 'ISSUE-1', toId: 'ISSUE-2', kind: 'FS' }
  expect(dep.fromId).toBe('ISSUE-1')
  expect(dep.toId).toBe('ISSUE-2')
  expect(dep.kind).toBe('FS')
  expect(dep.lagDays).toBeUndefined()

  const withLag: GanttDependency = { ...dep, kind: 'SS', lagDays: 3 }
  expect(withLag.lagDays).toBe(3)
})
