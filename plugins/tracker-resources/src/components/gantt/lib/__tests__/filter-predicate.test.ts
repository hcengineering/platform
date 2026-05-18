//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import { applyFilter, countActiveFilters, type GanttFilter } from '../filter-predicate'

function makeIssue (id: string, over: Partial<Issue> = {}): Issue {
  return {
    _id: id,
    _class: 'tracker:class:Issue',
    space: 'space1',
    status: 's-default',
    priority: 0,
    assignee: null,
    component: null,
    milestone: null,
    title: id,
    rank: '0',
    identifier: id,
    number: 1,
    estimation: 0,
    reportedTime: 0,
    childInfo: [],
    description: null,
    subIssues: 0,
    parents: [],
    labels: 0,
    ...over
  } as unknown as Issue
}

describe('applyFilter', () => {
  const a = makeIssue('a', { status: 's-backlog' as any, priority: 1 as any, assignee: 'p-1' as any })
  const b = makeIssue('b', { status: 's-progress' as any, priority: 2 as any, assignee: null })
  const c = makeIssue('c', { status: 's-done' as any, priority: 3 as any, assignee: 'p-2' as any })

  it('passes all issues for an empty filter', () => {
    expect(applyFilter([a, b, c], {})).toEqual([a, b, c])
  })

  it('filters by status', () => {
    const f: GanttFilter = { status: ['s-backlog', 's-done'] }
    expect(applyFilter([a, b, c], f)).toEqual([a, c])
  })

  it('filters by priority', () => {
    const f: GanttFilter = { priority: [2] }
    expect(applyFilter([a, b, c], f)).toEqual([b])
  })

  it('filters by assignee — null entry matches unassigned', () => {
    const f: GanttFilter = { assignee: [null] }
    expect(applyFilter([a, b, c], f)).toEqual([b])
  })

  it('combines multiple keys with AND semantics', () => {
    const f: GanttFilter = { status: ['s-backlog', 's-progress'], assignee: ['p-1'] }
    expect(applyFilter([a, b, c], f)).toEqual([a])
  })

  it('ignores filter keys whose value is an empty array', () => {
    const f: GanttFilter = { status: [] }
    expect(applyFilter([a, b, c], f)).toEqual([a, b, c])
  })

  it('ignores unknown filter keys (forward compat)', () => {
    const f = { weirdKey: ['foo'] } as unknown as GanttFilter
    expect(applyFilter([a, b, c], f)).toEqual([a, b, c])
  })

  it('returns the same array reference contract: never mutates input', () => {
    const input = [a, b, c]
    applyFilter(input, { status: ['s-backlog'] })
    expect(input).toEqual([a, b, c])
  })
})

describe('countActiveFilters', () => {
  it('counts only keys with at least one value', () => {
    expect(countActiveFilters({})).toBe(0)
    expect(countActiveFilters({ status: ['s-1'] })).toBe(1)
    expect(countActiveFilters({ status: ['s-1'], priority: [1, 2] })).toBe(2)
    expect(countActiveFilters({ status: [], priority: [1] })).toBe(1)
  })
})
