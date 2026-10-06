//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  detectCycle,
  addScheduleDays,
  simulateCascade,
  shiftScheduleDays,
  shiftWithPrimary,
  keyboardWeekStep
} from '../scheduler'
import {
  createTimeScale,
  dragCalendar,
  reduce,
  isWorkingDay,
  fsAnchor,
  fsReverseAnchor,
  ssAnchor,
  ssReverseAnchor,
  ffAnchor,
  ffReverseAnchor,
  sfAnchor,
  sfReverseAnchor
} from '@hcengineering/gantt'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { DragState, DragTarget, PrimaryEdit } from '../types'

function issue (id: string, start?: number, due?: number): Issue {
  return {
    _id: id as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'space:default' as any,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any,
    startDate: start ?? null,
    dueDate: due ?? null,
    parents: []
  } as unknown as Issue
}

function rel (
  source: string,
  target: string,
  kind: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish' = 'finish-to-start',
  lag = 0
): IssueRelation {
  return {
    _id: `rel:${source}->${target}` as any,
    _class: 'tracker:class:IssueRelation' as any,
    space: 'space:default' as any,
    attachedTo: source as Ref<Issue>,
    target: target as Ref<Issue>,
    kind,
    lag,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any
  } as unknown as IssueRelation
}

describe('detectCycle', () => {
  it('returns null for an acyclic graph', () => {
    const relations = [rel('A', 'B'), rel('B', 'C')]
    expect(detectCycle(relations)).toBeNull()
  })

  it('returns nodes of a direct cycle', () => {
    const relations = [rel('A', 'B'), rel('B', 'A')]
    const result = detectCycle(relations)
    expect(result).not.toBeNull()
    expect(new Set(result)).toEqual(new Set(['A', 'B']))
  })

  it('returns nodes of an indirect cycle', () => {
    const relations = [rel('A', 'B'), rel('B', 'C'), rel('C', 'A')]
    const result = detectCycle(relations)
    expect(result).not.toBeNull()
    expect(new Set(result)).toEqual(new Set(['A', 'B', 'C']))
  })

  it('reports a self-loop relation as a cycle', () => {
    const relations = [rel('A', 'A')]
    expect(detectCycle(relations)).not.toBeNull()
  })
})

describe('addScheduleDays', () => {
  it('adds N days in milliseconds (Phase-1 calendar days)', () => {
    const base = Date.UTC(2026, 4, 12)
    expect(addScheduleDays(base, 5)).toBe(Date.UTC(2026, 4, 17))
  })

  it('subtracts N days when given a negative argument', () => {
    const base = Date.UTC(2026, 4, 12)
    expect(addScheduleDays(base, -3)).toBe(Date.UTC(2026, 4, 9))
  })

  it('returns base unchanged when days = 0', () => {
    const base = Date.UTC(2026, 4, 12)
    expect(addScheduleDays(base, 0)).toBe(base)
  })
})

describe('shiftScheduleDays / shiftWithPrimary / keyboardWeekStep', () => {
  // May 2026: Mon 18 .. Wed 27.
  const D = (day: number): number => Date.UTC(2026, 4, day)
  const cfgMonFri = { weekdayMask: 0b0011111, holidays: [] }

  it('shiftScheduleDays counts working days with a calendar and calendar days without', () => {
    expect(shiftScheduleDays(D(22), 1, cfgMonFri)).toBe(D(25))
    expect(shiftScheduleDays(D(22), 1, undefined)).toBe(D(23))
    expect(shiftScheduleDays(D(18), 7, undefined)).toBe(D(25))
    expect(shiftScheduleDays(D(18), 5, cfgMonFri)).toBe(D(25))
    expect(shiftScheduleDays(D(23), 0, cfgMonFri)).toBe(D(23))
  })

  it('shiftWithPrimary moves a child by the primary move in working days with a calendar', () => {
    expect(shiftWithPrimary(D(22), D(18), D(19), cfgMonFri)).toBe(D(25))
    expect(shiftWithPrimary(D(22), D(18), D(19), undefined)).toBe(D(23))
  })

  describe('parent drag with the calendar-days override (Shift held)', () => {
    // Parent Mon 18 – Wed 20 with child Tue 19 – Wed 20, dragged +5 days so
    // the pointer is on Saturday 23. GanttView shifts the children with
    // shiftWithPrimary(…, dragCalendar(state, calendar)).
    const parent = issue('P', D(18), D(20))
    const ts = createTimeScale('week', D(18))
    const start: DragState = {
      kind: 'dragging-body',
      target: { kind: 'issue', doc: parent },
      originStart: D(18),
      originEnd: D(20),
      cursorStartX: 200,
      previewStart: D(18),
      previewEnd: D(20)
    }
    const move = (state: DragState, calendarDays: boolean | undefined, cfg: typeof cfgMonFri | undefined): DragState =>
      reduce<DragTarget, Issue>(state, { type: 'mousemove', cursorX: 270, calendarDays }, ts, cfg)
    const children = (state: DragState, cfg: typeof cfgMonFri | undefined): number[] => {
      if (state.kind !== 'dragging-body') throw new Error('expected dragging-body')
      const childCfg = dragCalendar(state, cfg)
      return [D(19), D(20)].map((t) => shiftWithPrimary(t, state.originStart, state.previewStart, childCfg))
    }

    it('without Shift the parent snaps to Monday and the child moves by working days', () => {
      const next = move(start, undefined, cfgMonFri)
      if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
      expect([next.previewStart, next.previewEnd]).toEqual([D(25), D(27)])
      expect(children(next, cfgMonFri)).toEqual([D(26), D(27)])
    })

    it('with Shift parent and child move by calendar days onto the weekend', () => {
      const next = move(start, true, cfgMonFri)
      if (next.kind !== 'dragging-body') throw new Error('expected dragging-body')
      expect([next.previewStart, next.previewEnd]).toEqual([D(23), D(25)])
      expect(children(next, cfgMonFri)).toEqual([D(24), D(25)])
    })

    it('releasing Shift before the drop restores the working-day result', () => {
      const pressed = move(start, true, cfgMonFri)
      const released = move(pressed, false, cfgMonFri)
      expect(children(released, cfgMonFri)).toEqual([D(26), D(27)])
    })

    it('in legacy mode Shift changes nothing', () => {
      const plain = move(start, undefined, undefined)
      const pressed = move(start, true, undefined)
      expect(pressed).toEqual(plain)
      expect(children(pressed, undefined)).toEqual([D(24), D(25)])
    })
  })

  it('shiftWithPrimary leaves the child unchanged for a zero move in both modes', () => {
    expect(shiftWithPrimary(D(23), D(18), D(18), cfgMonFri)).toBe(D(23))
    expect(shiftWithPrimary(D(23), D(18), D(18), undefined)).toBe(D(23))
  })

  it('shiftWithPrimary handles a move to the left', () => {
    // Primary Mon 25 → Fri 22: one working day back, three calendar days back.
    expect(shiftWithPrimary(D(27), D(25), D(22), cfgMonFri)).toBe(D(26))
    expect(shiftWithPrimary(D(27), D(25), D(22), undefined)).toBe(D(24))
  })

  it('shiftWithPrimary falls back to the raw delta for a non-finite or huge move', () => {
    const huge = 50_000 * 86_400_000
    expect(shiftWithPrimary(D(22), D(18), D(18) + huge, cfgMonFri)).toBe(D(22) + huge)
    expect(shiftWithPrimary(D(22), D(18), Infinity, cfgMonFri)).toBe(Infinity)
    expect(shiftWithPrimary(D(22), D(18), NaN, cfgMonFri)).toBeNaN()
  })

  it('keyboardWeekStep is seven calendar days without a calendar and the active weekdays with one', () => {
    expect(keyboardWeekStep(undefined)).toBe(7)
    expect(keyboardWeekStep(cfgMonFri)).toBe(5)
    expect(keyboardWeekStep({ weekdayMask: 0b1111111, holidays: [] })).toBe(7)
  })
})

describe('simulateCascade — FS basic', () => {
  it('Test 1: FS push — drag A 3d later → B shifts 3d later', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts).toHaveLength(1)
    expect(res.shifts[0].issue._id).toBe('B')
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 9))
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 13))
    expect(res.shifts[0].reason).toBe('push-successor')
  })

  it('Test 13: drag A by safe amount → no cascade needed', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 20), Date.UTC(2026, 4, 25))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 2), newDue: Date.UTC(2026, 4, 6) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('no-cascade')
  })
})

describe('simulateCascade — anchor model SS/FF/SF', () => {
  it('Test 2: SS push — drag A.start later → B.start moves', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const relations = [rel('A', 'B', 'start-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 3), newDue: Date.UTC(2026, 4, 7) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 3))
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 7))
  })

  it('Test 3: FF push — drag A.due later → B.due moves preserving duration', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const relations = [rel('A', 'B', 'finish-to-finish', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 8) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 8))
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 4))
  })

  it('Test 4: SF push — drag A.start later → B.due moves', () => {
    const A = issue('A', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 9))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const relations = [rel('A', 'B', 'start-to-finish', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 10), newDue: Date.UTC(2026, 4, 14) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 10))
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 6))
  })

  it('Test 6: FS with lag=2 — successor starts due+1+lag (working-days convention)', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-start', 2)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 5) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // Date semantics: succ.start = pred.due + (1 + lag) days in legacy mode.
    // Was May 7 prior to the off-by-one fix that aligned scheduler.ts with critical-path.ts.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 8))
  })

  it('Test 7: FS with lag=-1 — overlap allowed; required start = due + 1d - 1d = due itself', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 10))
    const B = issue('B', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 8))
    const relations = [rel('A', 'B', 'finish-to-start', -1)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 12) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    // required B.start = 2026-05-12 + (1 + -1) = 2026-05-12 (lead exactly cancels +1-day).
    // Current is 2026-05-05 → push.
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 12))
  })

  it('Test 15: FF push with lag=1 — preserves duration', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-finish', 1)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 12) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // required B.due = 2026-05-12 + 1d = 2026-05-13. B duration = 9d. New B.start = 2026-05-04.
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 13))
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 4))
  })
})

describe('simulateCascade — pull-predecessor', () => {
  it('Test 5: drag B earlier so A→B FS violated → A pulled earlier', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: B, newStart: Date.UTC(2026, 4, 2), newDue: Date.UTC(2026, 4, 6) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts).toHaveLength(1)
    expect(res.shifts[0].issue._id).toBe('A')
    expect(res.shifts[0].reason).toBe('pull-predecessor')
    // Date semantics: pred.due must be B.start - 1 day (the +1-day FS rule).
    // B.newStart = 2026-05-02 → A.newDue = 2026-05-01. A duration 4d → start = 2026-04-27.
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 1))
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 3, 27))
  })
})

describe('simulateCascade — parent-drag and edge cases', () => {
  it('Test 8: parent-drag with two children, each child has a successor', () => {
    const Parent = issue('P', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 15))
    const C1 = issue('C1', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const C2 = issue('C2', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const S1 = issue('S1', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 8))
    const S2 = issue('S2', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 13))
    const relations = [rel('C1', 'S1', 'finish-to-start'), rel('C2', 'S2', 'finish-to-start')]
    const primary: PrimaryEdit[] = [
      { issue: Parent, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 18) },
      { issue: C1, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) },
      { issue: C2, newStart: Date.UTC(2026, 4, 9), newDue: Date.UTC(2026, 4, 13) }
    ]
    const res = simulateCascade(primary, [Parent, C1, C2, S1, S2], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const shiftIds = res.shifts.map((s) => s.issue._id).sort()
    expect(shiftIds).toEqual(['S1', 'S2'])
  })

  it('Test 10: unscheduled successor is skipped, counted', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B') // no dates
    const relations = [rel('A', 'B', 'finish-to-start')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('no-cascade')
    // skippedUnscheduled is not surfaced in no-cascade; convert behaviour-test instead:
    // simulate with a real shifted successor as well to inspect the field
  })

  it('Test 10b: skippedUnscheduled is reported in cascade result', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C') // no dates
    const relations = [rel('A', 'B', 'finish-to-start'), rel('A', 'C', 'finish-to-start')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }]
    const res = simulateCascade(primary, [A, B, C], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.skippedUnscheduled).toBe(1)
    expect(res.shifts.map((s) => s.issue._id)).toEqual(['B'])
  })

  it('Test 17: A→B→C with A and C both primary — B is cascaded, C is not overwritten', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 15))
    const relations = [rel('A', 'B'), rel('B', 'C')]
    const newCStart = Date.UTC(2026, 4, 25)
    const newCDue = Date.UTC(2026, 4, 29)
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) },
      { issue: C, newStart: newCStart, newDue: newCDue }
    ]
    const res = simulateCascade(primary, [A, B, C], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // B must be shifted (push by A). C must NOT appear in shifts — its
    // primary edit is authoritative even though B→C would otherwise
    // propagate.
    const shiftIds = res.shifts.map((s) => s.issue._id)
    expect(shiftIds).toContain('B')
    expect(shiftIds).not.toContain('C')
  })

  it('Test 14: primary-vs-cascade merge — child in primary is not re-shifted', () => {
    const Parent = issue('P', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 15))
    const Sibling = issue('Sib', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 3))
    const Child = issue('Child', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const relations = [rel('Sib', 'Child', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [
      { issue: Parent, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 19) },
      { issue: Child, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) }
    ]
    const res = simulateCascade(primary, [Parent, Sibling, Child], relations, () => true)
    // Sib has no incoming relations and is unaffected. Child is primary → must
    // not appear in shifts even though Sib→Child would force a push otherwise.
    if (res.kind === 'cascade') {
      expect(res.shifts.map((s) => s.issue._id)).not.toContain('Child')
    } else {
      expect(res.kind).toBe('no-cascade')
    }
  })

  it('Test 18: parent-drag with locked child + no external successors → permission-denied (no silent commit)', () => {
    // Permission check must run BEFORE the shifts.size === 0 no-cascade
    // early-return. Otherwise a user could move a parent and silently
    // drag a non-editable child with it.
    const Parent = issue('P', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 15))
    const Child = issue('Child', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const primary: PrimaryEdit[] = [
      { issue: Parent, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 19) },
      { issue: Child, newStart: Date.UTC(2026, 4, 5), newDue: Date.UTC(2026, 4, 9) }
    ]
    // No relations at all -> shifts will be empty.
    const res = simulateCascade(primary, [Parent, Child], [], (ref) => ref !== 'Child')
    expect(res.kind).toBe('permission-denied')
    if (res.kind !== 'permission-denied') return
    expect(res.lockedIssues.map((i) => i._id)).toEqual(['Child'])
  })
})

describe('simulateCascade — chain propagation', () => {
  it('Test 9: A→B→C chain — drag A pushes B pushes C', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 15))
    const relations = [rel('A', 'B'), rel('B', 'C')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }]
    const res = simulateCascade(primary, [A, B, C], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const byId = new Map(res.shifts.map((s) => [s.issue._id, s]))
    expect(byId.get('B' as Ref<Issue>)?.newStart).toBe(Date.UTC(2026, 4, 9))
    expect(byId.get('B' as Ref<Issue>)?.newDue).toBe(Date.UTC(2026, 4, 13))
    expect(byId.get('C' as Ref<Issue>)?.newStart).toBe(Date.UTC(2026, 4, 14))
    expect(byId.get('C' as Ref<Issue>)?.newDue).toBe(Date.UTC(2026, 4, 18))
  })

  it('iteration cap fires defensively when maxIterations is tiny', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const C = issue('C', Date.UTC(2026, 4, 11), Date.UTC(2026, 4, 15))
    const D = issue('D', Date.UTC(2026, 4, 16), Date.UTC(2026, 4, 20))
    const relations = [rel('A', 'B'), rel('B', 'C'), rel('C', 'D')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 10), newDue: Date.UTC(2026, 4, 14) }]
    const res = simulateCascade(primary, [A, B, C, D], relations, () => true, { maxIterations: 1 })
    expect(res.kind).toBe('iteration-overflow')
  })
})

describe('simulateCascade — cycle bailout', () => {
  it('Test 11: A→B→A cycle in graph → returns cycle, no shifts', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B'), rel('B', 'A')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 2), newDue: Date.UTC(2026, 4, 6) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cycle')
    if (res.kind !== 'cycle') return
    expect(new Set(res.cycleNodes)).toEqual(new Set(['A', 'B']))
  })
})

describe('simulateCascade — permission denied', () => {
  it('Test 12: canEdit returns false for B → permission-denied, shifts populated', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-start')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }]
    const res = simulateCascade(primary, [A, B], relations, (ref) => ref !== 'B')
    expect(res.kind).toBe('permission-denied')
    if (res.kind !== 'permission-denied') return
    expect(res.lockedIssues.map((i) => i._id)).toEqual(['B'])
    expect(res.shifts.map((s) => s.issue._id)).toEqual(['B'])
  })
})

describe('simulateCascade — full-space scope', () => {
  it('Test 16: hidden issue X in space still produces a shift when reached via relations', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const bVisible = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const xHidden = issue('X', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 12))
    const relations = [rel('A', 'B', 'finish-to-start'), rel('A', 'X', 'finish-to-start')]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }]
    // Caller is responsible for passing all space issues, including X.
    const res = simulateCascade(primary, [A, bVisible, xHidden], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts.map((s) => s.issue._id).sort()).toEqual(['B', 'X'])
  })
})

describe('simulateCascade — working-days mode', () => {
  const cfgMonFri = { weekdayMask: 0b0011111, holidays: [] }

  it('FS lag=0 with Mo-Fr cfg: predecessor ends Friday → successor starts the next Monday (not Saturday)', () => {
    // A: Mon May 18 .. Fri May 22.  B (stale): Mon May 4 .. Fri May 8.
    const A = issue('A', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 22))
    const B = issue('B', Date.UTC(2026, 4, 4), Date.UTC(2026, 4, 8))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 22) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // fsAnchor(Fri May 22, 1 wd, Mo-Fr) = Mon May 25.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 25))
    // B keeps its five working days: Mon May 25 .. Fri May 29.
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 29))
  })

  it('FS lag=2 with Mo-Fr cfg: 2 working days after Friday = Wednesday next week', () => {
    const A = issue('A', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 22))
    const B = issue('B', Date.UTC(2026, 4, 4), Date.UTC(2026, 4, 8))
    const relations = [rel('A', 'B', 'finish-to-start', 2)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 22) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // fsAnchor(Fri May 22, (1 + 2) wd, Mo-Fr) = Wed May 27.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 27))
    // B keeps its five working days: Wed May 27 .. Tue Jun 2.
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 5, 2))
  })

  it('legacy (cfg=undefined): FS push uses calendar days with the +1-day rule', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-start', 2)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 5) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // legacy fsAnchor: May 5 + (1 + 2) days = May 8.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 8))
  })

  it('holiday in the middle: pred ends Monday with Tuesday a holiday → successor starts Wednesday (lag=0)', () => {
    const cfgWithHoliday = { weekdayMask: 0b0011111, holidays: [Date.UTC(2026, 4, 19)] }
    const A = issue('A', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 18))
    const B = issue('B', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 1))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 18) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgWithHoliday })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // Mon + 1 wd (Tue is holiday) = Wed May 20.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 20))
  })

  it('pull-predecessor in working-days mode: succ pulled before pred.due → pred ends previous Friday', () => {
    // A ends Mon Jun 8; B currently runs Mon Jun 15 .. Fri Jun 19.
    const A = issue('A', Date.UTC(2026, 5, 1), Date.UTC(2026, 5, 8))
    const B = issue('B', Date.UTC(2026, 5, 15), Date.UTC(2026, 5, 19))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    // Pull B earlier so it starts Mon May 25 — pred (A) ends Mon Jun 8 → must be pulled back.
    const primary: PrimaryEdit[] = [{ issue: B, newStart: Date.UTC(2026, 4, 25), newDue: Date.UTC(2026, 4, 29) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // fsReverseAnchor(Mon May 25, 0, cfg) = previous Fri May 22 → A.newDue = May 22.
    expect(res.shifts[0].issue._id).toBe('A')
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 22))
    // A keeps its six working days (Mon Jun 1 .. Mon Jun 8): Fri May 15 .. Fri May 22.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 15))
  })

  it('FS gap floor uses working days: drag A Fri→Mon (1 wd) pushes B by 1 working day, not 3 calendar days', () => {
    // A: 1-day bar Fri May 15. B: 1-day bar Mon May 18 — zero slack
    // (fsAnchor(Fri 15) = Mon 18).
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 18))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 18) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // snap = fsAnchor(Mon 18) = Tue 19; buggy raw floor was Mon 18 + 3d = Thu 21.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 19))
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 19))
  })

  it('Test 1: right-resize does not push — due extended, start day fixed → pure snap', () => {
    // A: 1-day Fri 15. B: 1-day Tue 19 (1 wd slack behind fsAnchor(Fri 15) = Mon 18).
    // Resize A's due to Fri 22 while the start day stays Fri 15.
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 19), Date.UTC(2026, 4, 19))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 15), newDue: Date.UTC(2026, 4, 22) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // Pure snap = fsAnchor(Fri 22) = Mon 25. An ungated due floor would give
    // addWorkingDays(Tue 19, 5) = Tue 26.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 25))
  })

  it('Test 2: weekend-spanner body-drag — due-side floor lands successor on Mon 25, never Fri/Sat', () => {
    // A: Fri 15 .. Mon 18 (spans the weekend). B: 1-day Wed 20 (1 wd slack).
    // Drag A +3 calendar days → Mon 18 .. Thu 21.
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 18))
    const B = issue('B', Date.UTC(2026, 4, 20), Date.UTC(2026, 4, 20))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 21) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // Due-side: workingDayDelta(Mon 18, Thu 21) = 3 → addWorkingDays(Wed 20, 3) = Mon 25.
    // Start-side floor would give Fri 22 (slack destroyed); raw floor Sat 23 (weekend).
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 25))
    expect(isWorkingDay(res.shifts[0].newStart, cfgMonFri)).toBe(true)
  })

  it('Test 3: multi-working-day drag over the weekend — successor snaps to Thu 21, never Saturday', () => {
    // A: 1-day Fri 15 → Wed 20 (raw +5, working +3). B: 1-day Mon 18 (zero slack).
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 18))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 20), newDue: Date.UTC(2026, 4, 20) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // fsAnchor(Wed 20) = Thu 21 (= floor). Buggy raw floor was Sat 23.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 21))
    expect(isWorkingDay(res.shifts[0].newStart, cfgMonFri)).toBe(true)
  })

  it('Test 4: floor wins over snap — preserves the 1 working-day slack', () => {
    // A: 1-day Fri 15. B: 1-day Tue 19 (1 wd slack). Drag A → Tue 19 (+2 wd).
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 19), Date.UTC(2026, 4, 19))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 19), newDue: Date.UTC(2026, 4, 19) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // snap = fsAnchor(Tue 19) = Wed 20; floor = addWorkingDays(Tue 19, 2) = Thu 21.
    // Option 2 (no floor) would give Wed 20; raw floor Sat 23.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 21))
  })

  it('Test 5: holiday in the floor advance path — floor steps over the holiday too', () => {
    const cfgHol = { weekdayMask: 0b0011111, holidays: [Date.UTC(2026, 4, 20)] }
    // A: 1-day Fri 15. B: 1-day Tue 19. Drag A → Tue 19 (workingDayDelta = 2 under cfgHol).
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 19), Date.UTC(2026, 4, 19))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 19), newDue: Date.UTC(2026, 4, 19) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgHol })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // snap = fsAnchor(Tue 19) = Thu 21 (Wed is a holiday); floor = addWorkingDays(Tue 19, 2)
    // = Fri 22 (Wed skipped in the floor advance too).
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 22))
  })

  it('Test 6: multi-hop FS chain — floor dominates the second hop and propagates through the cascade', () => {
    // A: 1-day Thu 14. B: Fri 15 .. Mon 18 (weekend spanner, two working days, zero slack:
    // fsAnchor(Thu 14) = Fri 15). C: 1-day Wed 20 (1 wd slack: fsAnchor(Mon 18) = Tue 19).
    // Primary: A → Mon 18.
    const A = issue('A', Date.UTC(2026, 4, 14), Date.UTC(2026, 4, 14))
    const B = issue('B', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 18))
    const C = issue('C', Date.UTC(2026, 4, 20), Date.UTC(2026, 4, 20))
    const relations = [rel('A', 'B', 'finish-to-start', 0), rel('B', 'C', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 18) }]
    const res = simulateCascade(primary, [A, B, C], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const byId = new Map(res.shifts.map((s) => [s.issue._id, s]))
    // Hop 1 (A→B): floor addWorkingDays(Fri 15, workingDayDelta(Thu 14, Mon 18) = 2) = Tue 19
    // = snap fsAnchor(Mon 18) → B keeps its two working days → Tue 19 .. Wed 20.
    expect(byId.get('B' as Ref<Issue>)?.newStart).toBe(Date.UTC(2026, 4, 19))
    expect(byId.get('B' as Ref<Issue>)?.newDue).toBe(Date.UTC(2026, 4, 20))
    // Hop 2 (B→C): floor addWorkingDays(Wed 20, workingDayDelta(Mon 18, Wed 20) = 2) = Fri 22
    // > snap fsAnchor(Wed 20) = Thu 21 → floor wins.
    expect(byId.get('C' as Ref<Issue>)?.newStart).toBe(Date.UTC(2026, 4, 22))
    expect(byId.get('C' as Ref<Issue>)?.newDue).toBe(Date.UTC(2026, 4, 22))
    expect(res.shifts.some((s) => s.reason === 'pull-predecessor')).toBe(false)
    expect(isWorkingDay(byId.get('C' as Ref<Issue>)?.newStart as number, cfgMonFri)).toBe(true)
  })

  it('Test 7: negative delta (predecessor dragged earlier) — snap wins, floor never pulls back', () => {
    // A: Mon 18 .. Fri 22 → dragged left to Mon 11 .. Fri 15. B: stale 1-day Mon May 4.
    const A = issue('A', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 22))
    const B = issue('B', Date.UTC(2026, 4, 4), Date.UTC(2026, 4, 4))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 11), newDue: Date.UTC(2026, 4, 15) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // snap = fsAnchor(Fri 15) = Mon 18 > Mon 4 → branch fires; floor (negative) < snap → max = snap.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 18))
  })

  it('Test 9: legacy mode (no cfg) — raw-ms floor unchanged (calendar days equal working days)', () => {
    // Same scenario as the working-days gap-floor test, but WITHOUT the workingDays option.
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 18))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 18) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // legacy fsAnchor(Mon 18) = Tue 19; raw floor Mon 18 + 3d = Thu 21 → max = Thu 21.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 21))
  })

  it('Test 10: SS relation in working-days mode — pure snap, no gap floor applied', () => {
    // A: 1-day Fri 15 → Mon 18. B: stale 1-day Mon May 4. start-to-start lag 0.
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 15))
    const B = issue('B', Date.UTC(2026, 4, 4), Date.UTC(2026, 4, 4))
    const relations = [rel('A', 'B', 'start-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 18), newDue: Date.UTC(2026, 4, 18) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // ssAnchor(Mon 18, 0) = Mon 18 — exact snap, no floor term.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 18))
  })

  it('Test 11: right-resize with a raw time-of-day original — day-granular gate keeps a pure snap', () => {
    // A: 1-day stored RAW with a time-of-day (Fri 15, 09:00 UTC — exactly how the
    // commit path reaches the scheduler). B: 1-day Tue 19 (midnight).
    const A = issue('A', Date.UTC(2026, 4, 15, 9), Date.UTC(2026, 4, 15, 9))
    const B = issue('B', Date.UTC(2026, 4, 19), Date.UTC(2026, 4, 19))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    // UI-normalized right-resize: start day unchanged, due extended to Fri 22.
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 15), newDue: Date.UTC(2026, 4, 22) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // Pure snap = fsAnchor(Fri 22) = Mon 25 — NO floor push. A raw `=== 0` gate would
    // have armed the floor (curStartDelta = -9h) → addWorkingDays(Tue 19, 5) = Tue 26.
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 25))
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 25))
  })

  it('Test 12: left-resize (start moved later, due fixed) — due-side delta 0 → pure snap, no weekend landing', () => {
    // A: Fri 15 .. Thu 21. B: stale 1-day Mon 18 (violated: fsAnchor(Thu 21) = Fri 22 > Mon 18).
    // Left-resize: start moves back to Wed 20, due stays Thu 21.
    const A = issue('A', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 21))
    const B = issue('B', Date.UTC(2026, 4, 18), Date.UTC(2026, 4, 18))
    const relations = [rel('A', 'B', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 20), newDue: Date.UTC(2026, 4, 21) }]
    const res = simulateCascade(primary, [A, B], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // workingDayDelta(Thu 21, Thu 21) = 0 → floor no-op → pure snap fsAnchor(Thu 21) = Fri 22.
    // The old raw floor would have shifted to Mon 18 + 5d = Sat 23 (a weekend).
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 22))
    expect(isWorkingDay(res.shifts[0].newStart, cfgMonFri)).toBe(true)
  })
})

describe('simulateCascade — working-days mode: reverse pass must not undo a satisfied FS link', () => {
  // Mon–Fri calendar with a holiday on Thu Oct 22 2026.
  const cfg = { weekdayMask: 0b0011111, holidays: [Date.UTC(2026, 9, 22)] }
  const oct = (d: number): number => Date.UTC(2026, 9, d)

  it('chain push A→B→C: B keeps its two working days (Fri 16–Mon 19), C follows on Tue 20–Wed 21', () => {
    // A Mon 5–Fri 9, B Mon 12–Tue 13, C Wed 14–Thu 15 (FS chain).
    const A = issue('A', oct(5), oct(9))
    const B = issue('B', oct(12), oct(13))
    const C = issue('C', oct(14), oct(15))
    const relations = [rel('A', 'B'), rel('B', 'C')]
    // Drag A onto Sun 11–Thu 15.
    const primary: PrimaryEdit[] = [{ issue: A, newStart: oct(11), newDue: oct(15) }]
    const res = simulateCascade(primary, [A, B, C], relations, () => true, { workingDays: cfg })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const byId = new Map(res.shifts.map((s) => [s.issue._id as string, s]))
    // fsAnchor(Thu 15) = Fri 16 → B keeps two working days: Fri 16–Mon 19.
    expect(byId.get('B')).toMatchObject({ newStart: oct(16), newDue: oct(19), reason: 'push-successor' })
    // fsAnchor(Mon 19) = Tue 20 = floor addWorkingDays(Wed 14, workingDayDelta(Tue 13, Mon 19) = 4)
    // → C Tue 20–Wed 21; fsAnchor(B.due Mon 19) = Tue 20 = C.start, so no pull.
    expect(byId.get('C')).toMatchObject({ newStart: oct(20), newDue: oct(21), reason: 'push-successor' })
    expect(res.shifts.some((s) => s.reason === 'pull-predecessor')).toBe(false)
  })

  it('successor dragged onto the first working day after a Saturday-ending predecessor → no cascade', () => {
    const B = issue('B', oct(16), oct(17))
    const C = issue('C', oct(21), oct(23))
    // fsAnchor(Sat 17) = Mon 19: the FS constraint is already satisfied.
    const primary: PrimaryEdit[] = [{ issue: C, newStart: oct(19), newDue: oct(20) }]
    const res = simulateCascade(primary, [B, C], [rel('B', 'C')], () => true, { workingDays: cfg })
    expect(res.kind).toBe('no-cascade')
  })

  it("successor dragged onto the predecessor's Friday (real violation) → predecessor pulled to Wed 14–Thu 15", () => {
    // B Thu 15–Fri 16 (two working days).
    const B = issue('B', oct(15), oct(16))
    const C = issue('C', oct(21), oct(23))
    const primary: PrimaryEdit[] = [{ issue: C, newStart: oct(16), newDue: oct(19) }]
    const res = simulateCascade(primary, [B, C], [rel('B', 'C')], () => true, { workingDays: cfg })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // fsReverseAnchor(Fri 16) = Thu 15 → B keeps two working days: Wed 14–Thu 15.
    expect(res.shifts).toHaveLength(1)
    expect(res.shifts[0]).toMatchObject({ newStart: oct(14), newDue: oct(15), reason: 'pull-predecessor' })
  })

  it('a pulled predecessor stored on Fri 16–Sat 17 becomes a one-working-day bar (Thu 15)', () => {
    const B = issue('B', oct(16), oct(17))
    const C = issue('C', oct(21), oct(23))
    const primary: PrimaryEdit[] = [{ issue: C, newStart: oct(16), newDue: oct(19) }]
    const res = simulateCascade(primary, [B, C], [rel('B', 'C')], () => true, { workingDays: cfg })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // workingDaySpan(Fri 16, Sat 17) = 1 → B Thu 15–Thu 15.
    expect(res.shifts).toHaveLength(1)
    expect(res.shifts[0]).toMatchObject({ newStart: oct(15), newDue: oct(15), reason: 'pull-predecessor' })
  })
})

describe('simulateCascade — working-days mode: shifted issues keep their working-day span', () => {
  const cfgMonFri = { weekdayMask: 0b0011111, holidays: [] }
  const may = (d: number): number => Date.UTC(2026, 4, d)
  const jun = (d: number): number => Date.UTC(2026, 5, d)

  function run (
    issues: Issue[],
    relations: IssueRelation[],
    primary: PrimaryEdit[],
    workingDays: { weekdayMask: number, holidays: number[] } | null = cfgMonFri
  ): Map<string, { newStart: number, newDue: number, reason: string }> {
    const res = simulateCascade(
      primary,
      issues,
      relations,
      () => true,
      workingDays === null ? undefined : { workingDays }
    )
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return new Map()
    return new Map(res.shifts.map((s) => [s.issue._id as string, s]))
  }

  it('push keeps a five-working-day successor at five working days across the weekend', () => {
    const A = issue('A', may(18), may(22))
    const B = issue('B', may(25), may(29))
    const byId = run([A, B], [rel('A', 'B')], [{ issue: A, newStart: may(20), newDue: may(26) }])
    expect(byId.get('B')).toMatchObject({ newStart: may(27), newDue: jun(2), reason: 'push-successor' })
    expect(isWorkingDay(byId.get('B')?.newDue as number, cfgMonFri)).toBe(true)
  })

  it('FF push across a weekend anchors the due date and keeps the span', () => {
    const A = issue('A', may(18), may(20))
    const B = issue('B', may(18), may(20))
    const byId = run([A, B], [rel('A', 'B', 'finish-to-finish')], [{ issue: A, newStart: may(18), newDue: may(26) }])
    expect(byId.get('B')).toMatchObject({ newStart: may(22), newDue: may(26), reason: 'push-successor' })
  })

  it('FS pull across a weekend keeps the predecessor span', () => {
    // A Thu 14 – Mon 18 = three working days.
    const A = issue('A', may(14), may(18))
    const B = issue('B', may(19), may(20))
    const res = simulateCascade(
      [{ issue: B, newStart: may(11), newDue: may(12) }],
      [A, B],
      [rel('A', 'B')],
      () => true,
      { workingDays: cfgMonFri }
    )
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts).toHaveLength(1)
    expect(res.shifts[0]).toMatchObject({ newStart: may(6), newDue: may(8), reason: 'pull-predecessor' })
  })

  it('a pushed bar steps over a holiday', () => {
    const cfgHol = { weekdayMask: 0b0011111, holidays: [may(21)] }
    const A = issue('A', may(15), may(15))
    const B = issue('B', may(18), may(19))
    const byId = run([A, B], [rel('A', 'B')], [{ issue: A, newStart: may(19), newDue: may(19) }], cfgHol)
    expect(byId.get('B')).toMatchObject({ newStart: may(20), newDue: may(22), reason: 'push-successor' })
  })

  it('a bar stored on non-working days becomes a one-working-day bar when pushed', () => {
    const A = issue('A', may(15), may(15))
    const B = issue('B', may(16), may(17))
    const byId = run([A, B], [rel('A', 'B')], [{ issue: A, newStart: may(18), newDue: may(18) }])
    expect(byId.get('B')).toMatchObject({ newStart: may(19), newDue: may(19), reason: 'push-successor' })
  })

  it('SS push across a weekend keeps the successor span', () => {
    const A = issue('A', may(18), may(20))
    const B = issue('B', may(18), may(19))
    const byId = run([A, B], [rel('A', 'B', 'start-to-start')], [{ issue: A, newStart: may(22), newDue: may(26) }])
    expect(byId.get('B')).toMatchObject({ newStart: may(22), newDue: may(25), reason: 'push-successor' })
  })

  it('SF push across a weekend anchors the due date and keeps the span', () => {
    const A = issue('A', may(18), may(20))
    const B = issue('B', may(11), may(12))
    const byId = run([A, B], [rel('A', 'B', 'start-to-finish')], [{ issue: A, newStart: may(25), newDue: may(27) }])
    expect(byId.get('B')).toMatchObject({ newStart: may(22), newDue: may(25), reason: 'push-successor' })
  })

  function pullOnly (
    A: Issue,
    B: Issue,
    kind: 'start-to-start' | 'finish-to-finish' | 'start-to-finish',
    primary: PrimaryEdit,
    workingDays: { weekdayMask: number, holidays: number[] } | null = cfgMonFri
  ): { newStart: number, newDue: number, reason: string } | undefined {
    const res = simulateCascade(
      [primary],
      [A, B],
      [rel('A', 'B', kind)],
      () => true,
      workingDays === null ? undefined : { workingDays }
    )
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return undefined
    expect(res.shifts).toHaveLength(1)
    return res.shifts[0]
  }

  it('SS pull across a weekend keeps the predecessor span', () => {
    // A Thu 21 – Mon 25 = three working days.
    const A = issue('A', may(21), may(25))
    const B = issue('B', may(21), may(22))
    const s = pullOnly(A, B, 'start-to-start', { issue: B, newStart: may(18), newDue: may(19) })
    expect(s).toMatchObject({ newStart: may(18), newDue: may(20), reason: 'pull-predecessor' })
  })

  it('SF pull across a weekend keeps the predecessor span', () => {
    // A Fri 22 – Tue 26 = three working days.
    const A = issue('A', may(22), may(26))
    const B = issue('B', may(20), may(22))
    const s = pullOnly(A, B, 'start-to-finish', { issue: B, newStart: may(18), newDue: may(20) })
    expect(s).toMatchObject({ newStart: may(20), newDue: may(22), reason: 'pull-predecessor' })
  })

  it('FF pull across a weekend keeps the predecessor span', () => {
    // A Thu 21 – Mon 25 = three working days.
    const A = issue('A', may(21), may(25))
    const B = issue('B', may(25), may(27))
    const s = pullOnly(A, B, 'finish-to-finish', { issue: B, newStart: may(18), newDue: may(20) })
    expect(s).toMatchObject({ newStart: may(18), newDue: may(20), reason: 'pull-predecessor' })
  })

  it('legacy mode keeps the calendar-day length on push', () => {
    const A = issue('A', may(18), may(22))
    const B = issue('B', may(25), may(29))
    const byId = run([A, B], [rel('A', 'B')], [{ issue: A, newStart: may(20), newDue: may(26) }], null)
    expect(byId.get('B')).toMatchObject({ newStart: may(27), newDue: may(31), reason: 'push-successor' })
  })

  it('legacy mode keeps the calendar-day length on pull', () => {
    const A = issue('A', may(21), may(25))
    const B = issue('B', may(21), may(22))
    const s = pullOnly(A, B, 'start-to-start', { issue: B, newStart: may(18), newDue: may(19) }, null)
    expect(s).toMatchObject({ newStart: may(18), newDue: may(22), reason: 'pull-predecessor' })
  })
})

describe('simulateCascade — legacy mode: reverse-pass guard is a no-op', () => {
  const may = (d: number): number => Date.UTC(2026, 4, d)

  it('forward/reverse anchors are exact inverses for every relation kind and lag (legacy)', () => {
    for (const lag of [-1, 0, 1, 2, 5]) {
      for (const x of [may(1), may(15), may(31)]) {
        expect(fsReverseAnchor(fsAnchor(x, lag, undefined), lag, undefined)).toBe(x)
        expect(ssReverseAnchor(ssAnchor(x, lag, undefined), lag, undefined)).toBe(x)
        expect(ffReverseAnchor(ffAnchor(x, lag, undefined), lag, undefined)).toBe(x)
        expect(sfReverseAnchor(sfAnchor(x, lag, undefined), lag, undefined)).toBe(x)
      }
    }
  })

  it('chain push A→B→C in legacy mode never emits pull-predecessor', () => {
    const A = issue('A', may(1), may(5))
    const B = issue('B', may(6), may(7))
    const C = issue('C', may(8), may(9))
    const res = simulateCascade(
      [{ issue: A, newStart: may(4), newDue: may(8) }],
      [A, B, C],
      [rel('A', 'B'), rel('B', 'C')],
      () => true
    )
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts.map((s) => [s.issue._id, s.newStart, s.newDue, s.reason])).toEqual([
      ['B', may(9), may(10), 'push-successor'],
      ['C', may(11), may(12), 'push-successor']
    ])
  })

  it('successor dragged onto pred.due + 1 day → no cascade; onto pred.due → pull by exactly one day (legacy)', () => {
    const A = issue('A', may(1), may(5))
    const B = issue('B', may(10), may(12))
    expect(
      simulateCascade([{ issue: B, newStart: may(6), newDue: may(8) }], [A, B], [rel('A', 'B')], () => true).kind
    ).toBe('no-cascade')
    const res = simulateCascade([{ issue: B, newStart: may(5), newDue: may(7) }], [A, B], [rel('A', 'B')], () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0]).toMatchObject({ newStart: may(0), newDue: may(4), reason: 'pull-predecessor' })
  })
})
