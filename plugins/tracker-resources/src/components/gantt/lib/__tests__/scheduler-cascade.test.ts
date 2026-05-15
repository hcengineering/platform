import { detectCycle, addScheduleDays } from '../scheduler'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

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

const DAY = 86_400_000

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
