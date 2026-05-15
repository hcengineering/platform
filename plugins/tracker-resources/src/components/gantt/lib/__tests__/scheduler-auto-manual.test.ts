//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { simulateCascade } from '../scheduler'
import { newCascadeToken } from '../cascade-token'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { PrimaryEdit } from '../types'

function issue (
  id: string,
  start?: number,
  due?: number,
  schedulingMode?: 'auto' | 'manual',
  parents: Array<{ parentId: string }> = []
): Issue {
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
    parents,
    schedulingMode
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

describe('simulateCascade — auto/manual scheduling-mode filter', () => {
  it('cascades through an Auto successor (regression sanity)', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10), 'auto')
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
    const res = simulateCascade(primary, [A, B], [rel('A', 'B')], () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    expect(res.shifts).toHaveLength(1)
    expect(res.shifts[0].issue._id).toBe('B')
  })

  it('does NOT cascade through a Manual successor — drops it from shifts', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10), 'manual')
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
    const res = simulateCascade(primary, [A, B], [rel('A', 'B')], () => true)
    // FS would normally require B to shift; with Manual B is filtered → no-cascade.
    expect(res.kind).toBe('no-cascade')
  })

  it('drops only Manual successors, keeps Auto ones in a mixed chain', () => {
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    // Three parallel successors, each FS-linked to A. Mix Manual into the set.
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10), 'auto')
    const C = issue('C', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10), 'manual')
    const D = issue('D', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
    const res = simulateCascade(
      primary,
      [A, B, C, D],
      [rel('A', 'B'), rel('A', 'C'), rel('A', 'D')],
      () => true
    )
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    const shifted = res.shifts.map((s) => String(s.issue._id)).sort()
    expect(shifted).toEqual(['B', 'D'])
  })

  it('still moves a Manual issue when the user drags it directly (Primary-bypass)', () => {
    // A is Manual but the user actively drags A → primary edit must commit.
    // Successor B (Auto) cascades as usual.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5), 'manual')
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
    const res = simulateCascade(primary, [A, B], [rel('A', 'B')], () => true)
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // A is the primary — A's dates are committed even though A is Manual.
    expect(res.primary).toHaveLength(1)
    expect(res.primary[0].issue._id).toBe('A')
    // B (Auto) cascades behind it.
    expect(res.shifts.map((s) => String(s.issue._id))).toEqual(['B'])
  })

  it('respects mode independently on parent + child (no inheritance)', () => {
    // Parent (Manual) and Child (Auto), both with FS predecessor P.
    // Child must still cascade; Parent must not.
    const P = issue('P', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const Parent = issue('Parent', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10), 'manual')
    const Child = issue('Child', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10), 'auto', [
      { parentId: 'Parent' }
    ])
    const primary: PrimaryEdit[] = [
      { issue: P, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
    const res = simulateCascade(
      primary,
      [P, Parent, Child],
      [rel('P', 'Parent'), rel('P', 'Child')],
      () => true
    )
    expect(res.kind).toBe('cascade')
    if (res.kind !== 'cascade') return
    // Only Child shifts; Parent (Manual) is filtered out.
    expect(res.shifts.map((s) => String(s.issue._id))).toEqual(['Child'])
  })

  it('does NOT pull a Manual predecessor backwards via reverse-cascade', () => {
    // A → B; user drags B to start earlier → cascade would normally pull A
    // backwards. With A Manual, A must stay pinned.
    const A = issue('A', Date.UTC(2026, 4, 5), Date.UTC(2026, 4, 9), 'manual')
    const B = issue('B', Date.UTC(2026, 4, 10), Date.UTC(2026, 4, 14))
    const primary: PrimaryEdit[] = [
      // Move B forward so its start would force A to move back to keep FS.
      { issue: B, newStart: Date.UTC(2026, 4, 7), newDue: Date.UTC(2026, 4, 11) }
    ]
    const res = simulateCascade(primary, [A, B], [rel('A', 'B')], () => true)
    expect(res.kind).toBe('no-cascade')
  })

  it('treats undefined schedulingMode as auto (Bestand-Issues unverändert)', () => {
    // Identical to the regression test above but explicitly without the field.
    const A = issue('A', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
    const B = issue('B', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10)) // no mode
    const primary: PrimaryEdit[] = [
      { issue: A, newStart: Date.UTC(2026, 4, 4), newDue: Date.UTC(2026, 4, 8) }
    ]
    const res = simulateCascade(primary, [A, B], [rel('A', 'B')], () => true)
    expect(res.kind).toBe('cascade')
  })
})

describe('newCascadeToken', () => {
  it('returns a string prefixed with the supplied scope', () => {
    const t = newCascadeToken('gantt-cascade-commit')
    expect(typeof t).toBe('string')
    expect(t.startsWith('gantt-cascade-commit:')).toBe(true)
  })

  it('uses the default prefix when none is supplied', () => {
    const t = newCascadeToken()
    expect(t.startsWith('gantt-cascade:')).toBe(true)
  })

  it('produces a unique suffix on every call', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) seen.add(newCascadeToken())
    expect(seen.size).toBe(100)
  })
})
