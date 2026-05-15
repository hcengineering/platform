//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { isOverdue, hasDeadline } from '../deadline-marker'

function makeIssue (deadline: number | null | undefined, dueDate: number | null = null): Issue {
  return {
    _id: 'i' as Ref<Issue>,
    deadline,
    dueDate
  } as unknown as Issue
}

describe('hasDeadline', () => {
  it('returns false when deadline is undefined', () => {
    expect(hasDeadline(makeIssue(undefined))).toBe(false)
  })
  it('returns false when deadline is null', () => {
    expect(hasDeadline(makeIssue(null))).toBe(false)
  })
  it('returns true when deadline is a number', () => {
    expect(hasDeadline(makeIssue(Date.UTC(2026, 0, 1)))).toBe(true)
  })
  it('returns true even when deadline is 0 (1970-01-01 — degenerate but valid timestamp)', () => {
    expect(hasDeadline(makeIssue(0))).toBe(true)
  })
})

describe('isOverdue', () => {
  it('returns false when no deadline set', () => {
    expect(isOverdue(makeIssue(undefined, Date.UTC(2026, 5, 1)))).toBe(false)
  })
  it('returns false when no dueDate set', () => {
    expect(isOverdue(makeIssue(Date.UTC(2026, 5, 1), null))).toBe(false)
  })
  it('returns false when dueDate <= deadline', () => {
    expect(isOverdue(makeIssue(Date.UTC(2026, 5, 10), Date.UTC(2026, 5, 5)))).toBe(false)
  })
  it('returns false when dueDate === deadline (boundary)', () => {
    expect(isOverdue(makeIssue(Date.UTC(2026, 5, 10), Date.UTC(2026, 5, 10)))).toBe(false)
  })
  it('returns true when dueDate > deadline', () => {
    expect(isOverdue(makeIssue(Date.UTC(2026, 5, 10), Date.UTC(2026, 5, 11)))).toBe(true)
  })
})
