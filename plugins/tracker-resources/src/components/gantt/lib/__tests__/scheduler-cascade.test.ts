//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { detectCycle, addScheduleDays, simulateCascade } from '../scheduler'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { PrimaryEdit, CascadeShift, SimulateResult } from '../types'

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

function rel (source: string, target: string, kind: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish' = 'finish-to-start', lag = 0): IssueRelation {
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
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
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
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 2), newDue: Date.UTC(2026, 4, 6) }
    ]
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

  it('Test 6: FS with lag=2 — successor starts due+2d', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 10))
    const relations = [rel('A', 'B', 'finish-to-start', 2)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 5) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 7))
  })

  it('Test 7: FS with lag=-1 — overlap allowed; required start = due - 1d', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 10))
    const B = issue('B', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 8))
    const relations = [rel('A', 'B', 'finish-to-start', -1)]
    const primary: PrimaryEdit[] = [{ issue: A, newStart: Date.UTC(2026, 4, 1), newDue: Date.UTC(2026, 4, 12) }]
    const res = simulateCascade(primary, [A, B], relations, () => true)
    // required B.start = 2026-05-12 - 1d = 2026-05-11. Current is 2026-05-05. Push.
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 4, 11))
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
    expect(res.shifts[0].newDue).toBe(Date.UTC(2026, 4, 2))
    expect(res.shifts[0].newStart).toBe(Date.UTC(2026, 3, 28)) // A duration 4d → start = 2026-04-28
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
    expect(byId.get('B' as Ref<Issue>)!.newStart).toBe(Date.UTC(2026, 4, 9))
    expect(byId.get('B' as Ref<Issue>)!.newDue).toBe(Date.UTC(2026, 4, 13))
    expect(byId.get('C' as Ref<Issue>)!.newStart).toBe(Date.UTC(2026, 4, 14))
    expect(byId.get('C' as Ref<Issue>)!.newDue).toBe(Date.UTC(2026, 4, 18))
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
