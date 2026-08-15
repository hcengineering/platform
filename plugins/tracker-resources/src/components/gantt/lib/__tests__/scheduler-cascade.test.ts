//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { detectCycle, addScheduleDays, simulateCascade } from '../scheduler'
import { isWorkingDay } from '@hcengineering/gantt'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { PrimaryEdit } from '../types'

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
    // A: 1-day Thu 14. B: Fri 15 .. Mon 18 (weekend spanner, zero slack: fsAnchor(Thu 14) = Fri 15).
    // C: 1-day Wed 20 (1 wd slack: fsAnchor(Mon 18) = Tue 19). Primary: A → Sat 16 (pinned non-working).
    const A = issue('A', Date.UTC(2026, 4, 14), Date.UTC(2026, 4, 14))
    const B = issue('B', Date.UTC(2026, 4, 15), Date.UTC(2026, 4, 18))
    const C = issue('C', Date.UTC(2026, 4, 20), Date.UTC(2026, 4, 20))
    const relations = [rel('A', 'B', 'finish-to-start', 0), rel('B', 'C', 'finish-to-start', 0)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 16), newDue: Date.UTC(2026, 4, 16) }]
    const res = simulateCascade(primary, [A, B, C], relations, () => true, { workingDays: cfgMonFri })
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const byId = new Map(res.shifts.map((s) => [s.issue._id, s]))
    // Hop 1 (A→B): snap = floor = Mon 18 (anchor case) → B keeps its 3-day span → Mon 18 .. Thu 21.
    expect(byId.get('B' as Ref<Issue>)?.newStart).toBe(Date.UTC(2026, 4, 18))
    expect(byId.get('B' as Ref<Issue>)?.newDue).toBe(Date.UTC(2026, 4, 21))
    // Hop 2 (B→C): floor addWorkingDays(Wed 20, 3) = Mon 25 > snap fsAnchor(Thu 21) = Fri 22 → floor wins.
    expect(byId.get('C' as Ref<Issue>)?.newStart).toBe(Date.UTC(2026, 4, 25))
    expect(byId.get('C' as Ref<Issue>)?.newDue).toBe(Date.UTC(2026, 4, 25))
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
