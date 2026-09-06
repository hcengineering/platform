//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation, DependencyKind } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { kindCode, kindFromCode, signedLag, formatPredecessors, resolveIssueNumber } from '../predecessor-format'
import type { LayoutRow } from '../types'

function mkRel (from: string, to: string, kind: DependencyKind, lag: number): IssueRelation {
  return {
    _id: `${from}->${to}` as Ref<IssueRelation>,
    attachedTo: from as Ref<Issue>,
    target: to as Ref<Issue>,
    kind,
    lag,
    space: 'sp' as IssueRelation['space']
  } as unknown as IssueRelation
}

const labelOf = (ref: Ref<Issue>): string =>
  ({
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
  it('omits suffix for zero', () => {
    expect(signedLag(0)).toBe('')
  })
  it('prefixes positive with +', () => {
    expect(signedLag(2)).toBe('+2d')
  })
  it('prefixes negative with -', () => {
    expect(signedLag(-1)).toBe('-1d')
  })
})

describe('formatPredecessors', () => {
  const issueB = { _id: 'b' as Ref<Issue> } as unknown as Issue

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
    const rels = [mkRel('a', 'b', 'finish-to-start', 2), mkRel('c', 'b', 'start-to-start', -1)]
    expect(formatPredecessors(issueB, rels, labelOf)).toBe('11FS+2d, 13SS-1d')
  })
})

describe('resolveIssueNumber', () => {
  const rowFor = (id: string, identifier: string): LayoutRow =>
    ({
      kind: 'issue',
      id,
      issue: { _id: id as Ref<Issue>, identifier }
    }) as unknown as LayoutRow

  const identifiers = new Map<Ref<Issue>, string>([
    ['a' as Ref<Issue>, 'PROJ-11'],
    ['b' as Ref<Issue>, 'PROJ-12']
  ])

  it('strips the project prefix', () => {
    expect(resolveIssueNumber('a' as Ref<Issue>, identifiers, [])).toBe('11')
  })

  it('resolves a predecessor that has no row — filtered, collapsed or in another lane', () => {
    // Only "b" is rendered; "a" is the predecessor and outside the visible rows.
    const rows = [rowFor('b', 'PROJ-12')]
    expect(resolveIssueNumber('a' as Ref<Issue>, identifiers, rows)).toBe('11')

    // …and the full notation keeps its number instead of degrading to "FS+2d".
    const issueB = { _id: 'b' as Ref<Issue> } as unknown as Issue
    const numberOf = (ref: Ref<Issue>): string => resolveIssueNumber(ref, identifiers, rows)
    expect(formatPredecessors(issueB, [mkRel('a', 'b', 'finish-to-start', 2)], numberOf)).toBe('11FS+2d')
  })

  it('falls back to the visible rows when no identifier map is supplied', () => {
    const rows = [rowFor('c', 'PROJ-13')]
    expect(resolveIssueNumber('c' as Ref<Issue>, new Map(), rows)).toBe('13')
  })

  it('returns empty string for a reference nothing knows about', () => {
    expect(resolveIssueNumber('zz' as Ref<Issue>, identifiers, [])).toBe('')
  })
})
