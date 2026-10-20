//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { calcIssueTimeStats, type IssueTimeInfo, type IssueTimeStatsOptions } from '../issueTimeStats'

function issue (
  id: string,
  status: string,
  estimation: number,
  reportedTime: number,
  parents: string[] = [],
  children: Array<{ childId: string, estimation: number, reportedTime: number }> = []
): IssueTimeInfo {
  return {
    _id: id as any,
    attachedTo: (parents[parents.length - 1] ?? 'no-parent') as any,
    parents: parents.map((parentId) => ({ parentId }) as any),
    status: status as any,
    estimation,
    reportedTime,
    childInfo: children as any
  }
}

const options = (skipUnStarted: boolean, includeAllChildren = false): IssueTimeStatsOptions<IssueTimeInfo> => ({
  isUnStarted: (it) => it.status === 'backlog',
  isClosed: (it) => it.status === 'done' || it.status === 'canceled',
  skipUnStarted,
  includeAllChildren
})

describe('calcIssueTimeStats', () => {
  it('returns zero for an empty group', () => {
    expect(calcIssueTimeStats([], options(false))).toEqual({ estimation: 0, reportedTime: 0 })
  })

  it('sums estimation and reported time of plain issues', () => {
    const docs = [issue('a', 'todo', 2, 1), issue('b', 'todo', 3, 0.5)]
    expect(calcIssueTimeStats(docs, options(false))).toEqual({ estimation: 5, reportedTime: 1.5 })
  })

  it('counts backlog issues unless skipUnStarted is set', () => {
    const docs = [issue('a', 'backlog', 4, 0), issue('b', 'todo', 1, 0)]
    expect(calcIssueTimeStats(docs, options(false)).estimation).toBe(5)
    expect(calcIssueTimeStats(docs, options(true)).estimation).toBe(1)
  })

  it('does not count a sub-issue twice when its parent is in the same group', () => {
    const parent = issue('p', 'todo', 10, 1, [], [
      { childId: 'c1', estimation: 2, reportedTime: 1 },
      { childId: 'c2', estimation: 3, reportedTime: 0 }
    ])
    const c1 = issue('c1', 'todo', 2, 1, ['p'])
    const c2 = issue('c2', 'todo', 3, 0, ['p'])
    expect(calcIssueTimeStats([parent, c1, c2], options(false))).toEqual({ estimation: 5, reportedTime: 2 })
  })

  it('leaves time of sub-issues listed in another group to that group', () => {
    const parent = issue('p', 'todo', 10, 1, [], [
      { childId: 'c1', estimation: 2, reportedTime: 1 },
      { childId: 'c2', estimation: 3, reportedTime: 4 }
    ])
    const c1 = issue('c1', 'todo', 2, 1, ['p'])
    const c2 = issue('c2', 'done', 3, 4, ['p'])
    // Group A holds the parent and c1, group B holds c2 only.
    const a = calcIssueTimeStats([parent, c1], options(false))
    const b = calcIssueTimeStats([c2], options(false))
    expect(a).toEqual({ estimation: 2, reportedTime: 2 })
    expect(b).toEqual({ estimation: 3, reportedTime: 4 })
  })

  it('uses own time of a parent whose sub-issues are all in other groups', () => {
    const parent = issue('p', 'todo', 10, 1, [], [{ childId: 'c1', estimation: 2, reportedTime: 1 }])
    expect(calcIssueTimeStats([parent], options(false))).toEqual({ estimation: 10, reportedTime: 1 })
  })

  it('counts all sub-issues through the parent when sub-issues are not listed', () => {
    const parent = issue('p', 'todo', 10, 1, [], [
      { childId: 'c1', estimation: 2, reportedTime: 1 },
      { childId: 'c2', estimation: 3, reportedTime: 0 }
    ])
    expect(calcIssueTimeStats([parent], options(false, true))).toEqual({ estimation: 5, reportedTime: 2 })
  })

  it('skips a nested sub-issue whose ancestor is in the group', () => {
    const root = issue('r', 'todo', 0, 0, [], [
      { childId: 'm', estimation: 0, reportedTime: 0 },
      { childId: 'g', estimation: 4, reportedTime: 1 }
    ])
    // The intermediate parent 'm' is in another group.
    const grandChild = issue('g', 'todo', 4, 1, ['r', 'm'])
    expect(calcIssueTimeStats([root, grandChild], options(false))).toEqual({ estimation: 4, reportedTime: 1 })
  })

  it('counts a sub-issue whose parent is in another group', () => {
    const child = issue('c', 'todo', 2, 1, ['p'])
    expect(calcIssueTimeStats([child], options(false))).toEqual({ estimation: 2, reportedTime: 1 })
  })

  it('keeps parent estimation when sub-issues are not estimated', () => {
    const parent = issue('p', 'todo', 8, 0, [], [{ childId: 'c', estimation: 0, reportedTime: 0 }])
    const child = issue('c', 'todo', 0, 0, ['p'])
    expect(calcIssueTimeStats([parent, child], options(false)).estimation).toBe(8)
  })

  it('caps estimation of closed issues by reported time', () => {
    const docs = [
      issue('a', 'done', 5, 2),
      issue('b', 'canceled', 1, 3),
      issue('p', 'done', 0, 0, [], [{ childId: 'c', estimation: 6, reportedTime: 4 }]),
      issue('c', 'done', 6, 4, ['p'])
    ]
    expect(calcIssueTimeStats(docs, options(false))).toEqual({ estimation: 2 + 1 + 4, reportedTime: 2 + 3 + 4 })
  })
})
