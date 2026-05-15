//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import {
  GROUP_BY_KEYS,
  NO_COMPONENT_KEY,
  NO_LABEL_KEY,
  NO_MILESTONE_KEY,
  NONE_KEY,
  UNASSIGNED_KEY,
  UNKNOWN_GROUP_KEY,
  getGroupLabel,
  resolveGroupKey,
  sortGroupKeys,
  type GroupByKey
} from '../group-by'

function makeIssue (over: Partial<Issue>): Issue {
  return {
    _id: 'i1',
    _class: 'tracker:class:Issue',
    space: 'space1',
    status: 's-default',
    priority: 0,
    assignee: null,
    component: null,
    milestone: null,
    title: 'i',
    rank: '0',
    identifier: 'X-1',
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

describe('resolveGroupKey', () => {
  it('returns sentinel for none', () => {
    expect(resolveGroupKey(makeIssue({}), 'none')).toBe(NONE_KEY)
  })

  it('returns String(status) for status', () => {
    expect(resolveGroupKey(makeIssue({ status: 's-1' as any }), 'status')).toBe('s-1')
  })

  it('returns String(priority) for priority — handles 0 (No priority)', () => {
    expect(resolveGroupKey(makeIssue({ priority: 0 as any }), 'priority')).toBe('0')
    expect(resolveGroupKey(makeIssue({ priority: 3 as any }), 'priority')).toBe('3')
  })

  it('returns assignee id, or unassigned sentinel when null', () => {
    expect(resolveGroupKey(makeIssue({ assignee: 'p-1' as any }), 'assignee')).toBe('p-1')
    expect(resolveGroupKey(makeIssue({ assignee: null }), 'assignee')).toBe(UNASSIGNED_KEY)
  })

  it('returns component id, or no-component sentinel', () => {
    expect(resolveGroupKey(makeIssue({ component: 'c-1' as any }), 'component')).toBe('c-1')
    expect(resolveGroupKey(makeIssue({ component: null }), 'component')).toBe(NO_COMPONENT_KEY)
  })

  it('returns milestone id, or no-milestone sentinel', () => {
    expect(resolveGroupKey(makeIssue({ milestone: 'm-1' as any }), 'milestone')).toBe('m-1')
    expect(resolveGroupKey(makeIssue({ milestone: null }), 'milestone')).toBe(NO_MILESTONE_KEY)
    expect(resolveGroupKey(makeIssue({ milestone: undefined as any }), 'milestone')).toBe(NO_MILESTONE_KEY)
  })

  it('returns first label id, or no-label sentinel', () => {
    const issueA = makeIssue({}) as unknown as { labels?: unknown }
    issueA.labels = ['lbl-a', 'lbl-b']
    expect(resolveGroupKey(issueA as Issue, 'label')).toBe('lbl-a')
    expect(resolveGroupKey(makeIssue({}), 'label')).toBe(NO_LABEL_KEY)
  })
})

describe('sortGroupKeys', () => {
  it('sorts strings naturally for non-priority keys', () => {
    expect(sortGroupKeys(['c', 'a', 'b'], 'status')).toEqual(['a', 'b', 'c'])
  })

  it('sorts priority numerically ascending', () => {
    expect(sortGroupKeys(['4', '1', '0', '3', '2'], 'priority')).toEqual(['0', '1', '2', '3', '4'])
  })

  it('puts the unassigned sentinel last for assignee', () => {
    expect(sortGroupKeys([UNASSIGNED_KEY, 'p-2', 'p-1'], 'assignee')).toEqual(['p-1', 'p-2', UNASSIGNED_KEY])
  })

  it('puts the no-component sentinel last for component', () => {
    expect(sortGroupKeys([NO_COMPONENT_KEY, 'c-b', 'c-a'], 'component')).toEqual(['c-a', 'c-b', NO_COMPONENT_KEY])
  })

  it('puts the no-milestone sentinel last for milestone', () => {
    expect(sortGroupKeys([NO_MILESTONE_KEY, 'm-b', 'm-a'], 'milestone')).toEqual(['m-a', 'm-b', NO_MILESTONE_KEY])
  })

  it('puts the no-label sentinel last for label', () => {
    expect(sortGroupKeys([NO_LABEL_KEY, 'l-b', 'l-a'], 'label')).toEqual(['l-a', 'l-b', NO_LABEL_KEY])
  })

  it('does not mutate the input array', () => {
    const input = ['b', 'a']
    const out = sortGroupKeys(input, 'status')
    expect(input).toEqual(['b', 'a'])
    expect(out).toEqual(['a', 'b'])
  })
})

describe('getGroupLabel', () => {
  it('returns the spec sentinel label for each well-known key', () => {
    expect(getGroupLabel(UNASSIGNED_KEY, 'assignee')).toBe('Unassigned')
    expect(getGroupLabel(NO_COMPONENT_KEY, 'component')).toBe('No component')
    expect(getGroupLabel(NO_MILESTONE_KEY, 'milestone')).toBe('No milestone')
    expect(getGroupLabel(NO_LABEL_KEY, 'label')).toBe('No label')
    expect(getGroupLabel(UNKNOWN_GROUP_KEY, 'status')).toBe('(unknown)')
    expect(getGroupLabel(NONE_KEY, 'none')).toBe('All issues')
  })

  it('passes through raw id otherwise — UI resolves to display name', () => {
    expect(getGroupLabel('foo-bar', 'status')).toBe('foo-bar')
  })
})

describe('GROUP_BY_KEYS', () => {
  it('lists all supported keys including none', () => {
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('none')
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('status')
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('priority')
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('assignee')
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('component')
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('milestone')
    expect(GROUP_BY_KEYS).toContain<GroupByKey>('label')
  })
})
