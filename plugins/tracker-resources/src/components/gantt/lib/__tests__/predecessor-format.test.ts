//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation, DependencyKind } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { kindCode, kindFromCode, signedLag, formatPredecessors } from '../predecessor-format'

function mkRel (
  from: string,
  to: string,
  kind: DependencyKind,
  lag: number
): IssueRelation {
  return {
    _id: `${from}->${to}` as Ref<IssueRelation>,
    attachedTo: from as Ref<Issue>,
    target: to as Ref<Issue>,
    kind,
    lag,
    space: 'sp' as IssueRelation['space']
  } as unknown as IssueRelation
}

const labelOf = (ref: Ref<Issue>): string => ({
  a: '11',
  b: '12',
  c: '13'
})[ref as unknown as string] ?? String(ref)

describe('kindCode + kindFromCode', () => {
  it.each<[DependencyKind, string]>([
    ['finish-to-start', 'FS'],
    ['start-to-start', 'SS'],
    ['finish-to-finish', 'FF'],
    ['start-to-finish', 'SF']
  ])('round-trips %s ↔ %s', (long, code) => {
    expect(kindCode(long)).toBe(code)
    expect(kindFromCode(code as 'FS' | 'SS' | 'FF' | 'SF')).toBe(long)
  })
})

describe('signedLag', () => {
  it('omits suffix for zero', () => { expect(signedLag(0)).toBe('') })
  it('prefixes positive with +', () => { expect(signedLag(2)).toBe('+2d') })
  it('prefixes negative with -', () => { expect(signedLag(-1)).toBe('-1d') })
})

describe('formatPredecessors', () => {
  const issueB = { _id: 'b' as Ref<Issue> } as Issue

  it('returns empty string when no relations target the issue', () => {
    expect(formatPredecessors(issueB, [], labelOf)).toBe('')
  })

  it('single FS+0 → "11FS" (zero lag omits the +0d)', () => {
    const rels = [mkRel('a', 'b', 'finish-to-start', 0)]
    expect(formatPredecessors(issueB, rels, labelOf)).toBe('11FS')
  })

  it('single FS+2 → "11FS+2d"', () => {
    const rels = [mkRel('a', 'b', 'finish-to-start', 2)]
    expect(formatPredecessors(issueB, rels, labelOf)).toBe('11FS+2d')
  })

  it('single SS-1 → "11SS-1d"', () => {
    const rels = [mkRel('a', 'b', 'start-to-start', -1)]
    expect(formatPredecessors(issueB, rels, labelOf)).toBe('11SS-1d')
  })

  it('ignores wrong-direction relations (B→C is not a predecessor of B)', () => {
    const rels = [mkRel('b', 'c', 'finish-to-start', 0)]
    expect(formatPredecessors(issueB, rels, labelOf)).toBe('')
  })

  it('joins multiple predecessors with ", " preserving relation-array order', () => {
    const rels = [
      mkRel('a', 'b', 'finish-to-start', 2),
      mkRel('c', 'b', 'start-to-start', -1)
    ]
    expect(formatPredecessors(issueB, rels, labelOf)).toBe('11FS+2d, 13SS-1d')
  })
})
