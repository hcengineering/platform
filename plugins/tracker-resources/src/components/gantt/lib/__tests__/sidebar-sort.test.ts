//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Ref } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'
import { IssuePriority } from '@hcengineering/tracker'
import { cycleSort, comparatorFor, type GanttSortState } from '../sidebar-sort'

interface IssueOverrides {
  _id: string
  title?: string
  identifier?: string
  priority?: IssuePriority
  estimation?: number
  startDate?: number | null
  dueDate?: number | null
  modifiedOn?: number
  createdOn?: number
}

function mkIssue (overrides: IssueOverrides): Issue {
  return {
    _id: overrides._id as Ref<Issue>,
    title: overrides.title ?? '',
    identifier: overrides.identifier ?? '',
    priority: overrides.priority ?? IssuePriority.NoPriority,
    estimation: overrides.estimation ?? 0,
    startDate: overrides.startDate ?? null,
    dueDate: overrides.dueDate ?? null,
    modifiedOn: overrides.modifiedOn ?? 0,
    createdOn: overrides.createdOn ?? 0,
    assignee: null,
    component: null,
    milestone: null,
    status: 's',
    rank: '',
    space: 'sp'
  } as unknown as Issue
}

describe('cycleSort', () => {
  it('null state + click column → asc on that column', () => {
    const next = cycleSort({ column: null, direction: 'asc' }, 'title')
    expect(next).toEqual({ column: 'title', direction: 'asc' })
  })

  it('asc on column + click same column → desc', () => {
    const next = cycleSort({ column: 'title', direction: 'asc' }, 'title')
    expect(next).toEqual({ column: 'title', direction: 'desc' })
  })

  it('desc on column + click same column → null (off)', () => {
    const next = cycleSort({ column: 'title', direction: 'desc' }, 'title')
    expect(next).toEqual({ column: null, direction: 'asc' })
  })

  it('clicking a different column resets to asc on the new column', () => {
    const next = cycleSort({ column: 'title', direction: 'desc' }, 'priority')
    expect(next).toEqual({ column: 'priority', direction: 'asc' })
  })

  it('null state stays null when input is the same null state', () => {
    const start: GanttSortState = { column: null, direction: 'asc' }
    expect(cycleSort(start, 'identifier')).toEqual({ column: 'identifier', direction: 'asc' })
  })
})

describe('comparatorFor — string columns', () => {
  const issues = [
    mkIssue({ _id: 'a', title: 'Banana', identifier: 'OST-2' }),
    mkIssue({ _id: 'b', title: 'apple', identifier: 'OST-1' }),
    mkIssue({ _id: 'c', title: 'Cherry', identifier: 'OST-3' })
  ]

  it('title asc uses locale-compare (case-insensitive)', () => {
    const cmp = comparatorFor('title', 'asc')
    const sorted = [...issues].sort(cmp).map((i) => i.title)
    expect(sorted).toEqual(['apple', 'Banana', 'Cherry'])
  })

  it('title desc reverses the asc order', () => {
    const cmp = comparatorFor('title', 'desc')
    const sorted = [...issues].sort(cmp).map((i) => i.title)
    expect(sorted).toEqual(['Cherry', 'Banana', 'apple'])
  })

  it('identifier asc sorts lexicographically', () => {
    const cmp = comparatorFor('identifier', 'asc')
    const sorted = [...issues].sort(cmp).map((i) => i.identifier)
    expect(sorted).toEqual(['OST-1', 'OST-2', 'OST-3'])
  })
})

describe('comparatorFor — enum columns', () => {
  const issues = [
    mkIssue({ _id: 'a', priority: IssuePriority.Low }),
    mkIssue({ _id: 'b', priority: IssuePriority.Urgent }),
    mkIssue({ _id: 'c', priority: IssuePriority.NoPriority }),
    mkIssue({ _id: 'd', priority: IssuePriority.Medium })
  ]

  it('priority asc orders by enum value (NoPriority=0 first)', () => {
    const cmp = comparatorFor('priority', 'asc')
    const sorted = [...issues].sort(cmp).map((i) => i.priority)
    expect(sorted).toEqual([
      IssuePriority.NoPriority,
      IssuePriority.Urgent,
      IssuePriority.Medium,
      IssuePriority.Low
    ])
  })

  it('priority desc inverts the order', () => {
    const cmp = comparatorFor('priority', 'desc')
    const sorted = [...issues].sort(cmp).map((i) => i.priority)
    expect(sorted).toEqual([
      IssuePriority.Low,
      IssuePriority.Medium,
      IssuePriority.Urgent,
      IssuePriority.NoPriority
    ])
  })
})

describe('comparatorFor — number columns', () => {
  const issues = [
    mkIssue({ _id: 'a', estimation: 5 }),
    mkIssue({ _id: 'b', estimation: 1 }),
    mkIssue({ _id: 'c', estimation: 10 })
  ]

  it('estimation asc', () => {
    const cmp = comparatorFor('estimation', 'asc')
    const sorted = [...issues].sort(cmp).map((i) => i.estimation)
    expect(sorted).toEqual([1, 5, 10])
  })

  it('estimation desc', () => {
    const cmp = comparatorFor('estimation', 'desc')
    const sorted = [...issues].sort(cmp).map((i) => i.estimation)
    expect(sorted).toEqual([10, 5, 1])
  })
})

describe('comparatorFor — date columns with nulls-last semantics', () => {
  const D1 = Date.UTC(2026, 0, 10)
  const D2 = Date.UTC(2026, 0, 20)
  const D3 = Date.UTC(2026, 0, 30)
  const issues = [
    mkIssue({ _id: 'a', startDate: D2 }),
    mkIssue({ _id: 'b', startDate: null }),
    mkIssue({ _id: 'c', startDate: D1 }),
    mkIssue({ _id: 'd', startDate: D3 })
  ]

  it('startDate asc with nulls last', () => {
    const cmp = comparatorFor('startDate', 'asc')
    const sorted = [...issues].sort(cmp).map((i) => i.startDate)
    expect(sorted).toEqual([D1, D2, D3, null])
  })

  it('startDate desc with nulls last (still last)', () => {
    const cmp = comparatorFor('startDate', 'desc')
    const sorted = [...issues].sort(cmp).map((i) => i.startDate)
    expect(sorted).toEqual([D3, D2, D1, null])
  })

  it('dueDate honours nulls-last identically', () => {
    const list = [
      mkIssue({ _id: 'a', dueDate: D1 }),
      mkIssue({ _id: 'b', dueDate: null })
    ]
    const cmp = comparatorFor('dueDate', 'asc')
    const sorted = [...list].sort(cmp).map((i) => i.dueDate)
    expect(sorted).toEqual([D1, null])
  })

  it('modifiedOn asc orders numerically', () => {
    const list = [
      mkIssue({ _id: 'a', modifiedOn: 200 }),
      mkIssue({ _id: 'b', modifiedOn: 100 }),
      mkIssue({ _id: 'c', modifiedOn: 300 })
    ]
    const cmp = comparatorFor('modifiedOn', 'asc')
    const sorted = [...list].sort(cmp).map((i) => i.modifiedOn)
    expect(sorted).toEqual([100, 200, 300])
  })
})

describe('comparatorFor — fallback', () => {
  it('unknown column returns 0 (preserves original order)', () => {
    const cmp = comparatorFor('progress', 'asc')
    const a = mkIssue({ _id: 'a' })
    const b = mkIssue({ _id: 'b' })
    expect(cmp(a, b)).toBe(0)
  })

  it('slack column is treated as non-orderable in v1 (returns 0)', () => {
    const cmp = comparatorFor('slack', 'asc')
    const a = mkIssue({ _id: 'a' })
    const b = mkIssue({ _id: 'b' })
    expect(cmp(a, b)).toBe(0)
  })

  it('predecessors column is non-orderable in v1', () => {
    const cmp = comparatorFor('predecessors', 'asc')
    const a = mkIssue({ _id: 'a' })
    const b = mkIssue({ _id: 'b' })
    expect(cmp(a, b)).toBe(0)
  })
})
