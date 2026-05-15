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
