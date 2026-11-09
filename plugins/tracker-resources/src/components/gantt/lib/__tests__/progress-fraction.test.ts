//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Ref } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'
import { progressFraction } from '../progress-fraction'

const sub = (status: string): Issue => ({ status }) as unknown as Issue
const cat = (id: Ref<IssueStatus>): string | null =>
  String(id).startsWith('done-') ? 'task:statusCategory:Won' : 'task:statusCategory:Active'

describe('progressFraction', () => {
  it('returns null when issue has zero sub-issues', () => {
    expect(progressFraction({ subIssues: 0 } as any, [], cat)).toBeNull()
  })

  it('returns null when issue claims sub-issues but the snapshot is empty', () => {
    expect(progressFraction({ subIssues: 5 } as any, [], cat)).toBeNull()
  })

  it('returns 0 when no sub is Done', () => {
    const subs = [sub('active-1'), sub('active-2'), sub('active-3')] as any
    expect(progressFraction({ subIssues: 3 } as any, subs, cat)).toBe(0)
  })

  it('returns 1 when all subs are Done', () => {
    const subs = [sub('done-1'), sub('done-2')] as any
    expect(progressFraction({ subIssues: 2 } as any, subs, cat)).toBe(1)
  })

  it('uses snapshot length, not issue.subIssues, to avoid stale-counter skew', () => {
    // issue.subIssues = 4 but snapshot has 3 — divide by 3
    const subs = [sub('done-1'), sub('active-2'), sub('active-3')] as any
    expect(progressFraction({ subIssues: 4 } as any, subs, cat)).toBeCloseTo(1 / 3)
  })
})
