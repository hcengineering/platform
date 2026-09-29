//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Ref } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'
import { isPastDue, isBlocked } from '../bar-overlays'

const baseIssue = (overrides: Partial<Issue> = {}): Issue =>
  ({
    _id: 'issue-1' as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'project-1' as any,
    modifiedOn: 0,
    createdBy: 'user-a' as any,
    modifiedBy: 'user-a' as any,
    ...overrides
  }) as unknown as Issue

describe('isPastDue', () => {
  const NOW = Date.UTC(2026, 4, 20) // 2026-05-20 UTC

  it('returns true when dueDate is in the past and status is not Done', () => {
    const issue = baseIssue({ dueDate: NOW - 86_400_000, status: 'sid-todo' as Ref<IssueStatus> })
    const cat = (_id: Ref<IssueStatus>): string => 'task:statusCategory:ToDo'
    expect(isPastDue(issue, cat, NOW)).toBe(true)
  })

  it('returns false when status category is Won (Done)', () => {
    const issue = baseIssue({ dueDate: NOW - 86_400_000, status: 'sid-done' as Ref<IssueStatus> })
    const cat = (_id: Ref<IssueStatus>): string => 'task:statusCategory:Won'
    expect(isPastDue(issue, cat, NOW)).toBe(false)
  })

  it('returns false when dueDate is in the future', () => {
    const issue = baseIssue({ dueDate: NOW + 86_400_000, status: 'sid-todo' as Ref<IssueStatus> })
    expect(isPastDue(issue, () => 'task:statusCategory:ToDo', NOW)).toBe(false)
  })

  it('returns false when dueDate is null', () => {
    const issue = baseIssue({ dueDate: null, status: 'sid-todo' as Ref<IssueStatus> })
    expect(isPastDue(issue, () => 'task:statusCategory:ToDo', NOW)).toBe(false)
  })

  it('returns false at the exact dueDate boundary (=== NOW)', () => {
    const issue = baseIssue({ dueDate: NOW, status: 'sid-todo' as Ref<IssueStatus> })
    expect(isPastDue(issue, () => 'task:statusCategory:ToDo', NOW)).toBe(false)
  })

  it('returns false for synthetic milestone-summary bars (no status field)', () => {
    // Synthetic bars from GanttCanvas.svelte:299 carry no `status`.
    // Without this guard, isPastDue would flag every overdue milestone
    // as 'past-due issue' which is wrong — milestones are not issues.
    const synthetic = { title: 'Sprint 5', startDate: NOW - 1e9, dueDate: NOW - 1e6 } as any
    expect(isPastDue(synthetic, () => null, NOW)).toBe(false)
  })
})

describe('isBlocked', () => {
  type CatLookup = (id: Ref<IssueStatus>) => string | null

  it('returns true when at least one FS predecessor is not Done', () => {
    const predIds = ['pred-1', 'pred-2'] as Array<Ref<Issue>>
    const predStatusOf = new Map<string, Ref<IssueStatus>>([
      ['pred-1', 'sid-active' as Ref<IssueStatus>],
      ['pred-2', 'sid-done' as Ref<IssueStatus>]
    ])
    const cat: CatLookup = (sid) =>
      sid === ('sid-active' as Ref<IssueStatus>) ? 'task:statusCategory:Active' : 'task:statusCategory:Won'
    expect(isBlocked(baseIssue(), predIds, predStatusOf, cat)).toBe(true)
  })

  it('returns false when all predecessors are Done (Won)', () => {
    const predIds = ['pred-1', 'pred-2'] as Array<Ref<Issue>>
    const predStatusOf = new Map<string, Ref<IssueStatus>>([
      ['pred-1', 'sid-done' as Ref<IssueStatus>],
      ['pred-2', 'sid-done' as Ref<IssueStatus>]
    ])
    expect(isBlocked(baseIssue(), predIds, predStatusOf, () => 'task:statusCategory:Won')).toBe(false)
  })

  it('returns false when there are no predecessors', () => {
    expect(isBlocked(baseIssue(), [], new Map(), () => 'task:statusCategory:Active')).toBe(false)
  })

  it('returns false when a predecessor has no status mapping (conservative)', () => {
    const predIds = ['pred-1'] as Array<Ref<Issue>>
    expect(isBlocked(baseIssue(), predIds, new Map(), () => null)).toBe(false)
  })
})
