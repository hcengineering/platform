//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { resolveBarLabel, type BarLabelSlot } from '../bar-labels'

function makeIssue (overrides: Partial<Issue> = {}): Issue {
  return {
    _id: 'iss-1' as Ref<Issue>,
    _class: 'tracker:class:Issue',
    identifier: 'TSK-1',
    title: 'Some Title',
    priority: 0,
    estimation: 0,
    reportedTime: 0,
    remainingTime: 0,
    subIssues: 0,
    parents: [],
    blockedBy: [],
    relations: [],
    childInfo: [],
    space: 'project-default',
    status: 'status-1',
    assignee: null,
    component: null,
    milestone: null,
    labels: 0,
    number: 1,
    modifiedOn: 0,
    modifiedBy: 'user-1',
    createdOn: 0,
    createdBy: 'user-1',
    ...overrides
  } as unknown as Issue
}

describe('resolveBarLabel', () => {
  it('returns empty string for none slot', () => {
    expect(resolveBarLabel(makeIssue(), 'none' as BarLabelSlot)).toBe('')
  })

  it('returns title when slot is title', () => {
    expect(resolveBarLabel(makeIssue({ title: 'Some Title' }), 'title')).toBe('Some Title')
  })

  it('returns identifier when slot is identifier', () => {
    expect(resolveBarLabel(makeIssue({ identifier: 'PRJ-42' }), 'identifier')).toBe('PRJ-42')
  })

  it('returns empty string for unassigned issue with assignee slot', () => {
    expect(resolveBarLabel(makeIssue({ assignee: null }), 'assignee')).toBe('')
  })

  it('returns priority number as string', () => {
    expect(resolveBarLabel(makeIssue({ priority: 1 }), 'priority')).toBe('1')
  })

  it('returns 0 for priority NoPriority (priority=0)', () => {
    expect(resolveBarLabel(makeIssue({ priority: 0 }), 'priority')).toBe('0')
  })

  it('returns estimation in hours when set', () => {
    expect(resolveBarLabel(makeIssue({ estimation: 8 }), 'estimation')).toBe('8h')
  })

  it('returns empty string for estimation = 0', () => {
    expect(resolveBarLabel(makeIssue({ estimation: 0 }), 'estimation')).toBe('')
  })

  it('returns status ref-shortened (last segment) when status slot', () => {
    // Real Issues store status as Ref<IssueStatus>. The resolver just stringifies.
    const r = resolveBarLabel(makeIssue({ status: 'tracker:status:Backlog' as Ref<any> }), 'status')
    // status slot resolves to last colon-segment for compactness
    expect(r).toBe('Backlog')
  })

  it('returns progress as percent when reportedTime > 0 and estimation > 0', () => {
    expect(
      resolveBarLabel(makeIssue({ estimation: 10, reportedTime: 3 }), 'progress')
    ).toBe('30%')
  })

  it('returns empty string for progress when estimation = 0', () => {
    expect(
      resolveBarLabel(makeIssue({ estimation: 0, reportedTime: 5 }), 'progress')
    ).toBe('')
  })
})
