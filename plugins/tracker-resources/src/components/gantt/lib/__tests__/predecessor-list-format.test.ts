//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation, DependencyKind } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import {
  formatPredecessorEntry,
  sortPredecessorsByIdentifier,
  splitFirstAndRest,
  type PredecessorEntry
} from '../predecessor-list-format'

function mkRel (
  from: string,
  to: string,
  kind: DependencyKind,
  lag: number
): IssueRelation {
  return {
    _id: `${from}->${to}-${kind}` as Ref<IssueRelation>,
    attachedTo: from as Ref<Issue>,
    target: to as Ref<Issue>,
    kind,
    lag,
    space: 'sp' as IssueRelation['space']
  } as unknown as IssueRelation
}

function mkIssue (id: string, identifier: string): Issue {
  return {
    _id: id as Ref<Issue>,
    identifier
  } as unknown as Issue
}

describe('formatPredecessorEntry', () => {
  const src = mkIssue('a', 'PROJ-3')

  it('FS lag 0 -> "PROJ-3 FS"', () => {
    const rel = mkRel('a', 'b', 'finish-to-start', 0)
    expect(formatPredecessorEntry(rel, src)).toBe('PROJ-3 FS')
  })
  it('FS lag +2 -> "PROJ-3 FS+2d"', () => {
    const rel = mkRel('a', 'b', 'finish-to-start', 2)
    expect(formatPredecessorEntry(rel, src)).toBe('PROJ-3 FS+2d')
  })
  it('SS lag -1 -> "PROJ-3 SS-1d"', () => {
    const rel = mkRel('a', 'b', 'start-to-start', -1)
    expect(formatPredecessorEntry(rel, src)).toBe('PROJ-3 SS-1d')
  })
  it('FF lag 0 -> "PROJ-3 FF"', () => {
    const rel = mkRel('a', 'b', 'finish-to-finish', 0)
    expect(formatPredecessorEntry(rel, src)).toBe('PROJ-3 FF')
  })
  it('SF lag +5 -> "PROJ-3 SF+5d"', () => {
    const rel = mkRel('a', 'b', 'start-to-finish', 5)
    expect(formatPredecessorEntry(rel, src)).toBe('PROJ-3 SF+5d')
  })
})

describe('sortPredecessorsByIdentifier', () => {
  it('returns empty array when no relations given', () => {
    expect(sortPredecessorsByIdentifier([], new Map())).toEqual([])
  })

  it('passes a single entry through unchanged', () => {
    const rel = mkRel('a', 'b', 'finish-to-start', 0)
    const sources = new Map<Ref<Issue>, Issue>([['a' as Ref<Issue>, mkIssue('a', 'PROJ-3')]])
    const out = sortPredecessorsByIdentifier([rel], sources)
    expect(out).toHaveLength(1)
    expect(out[0].source.identifier).toBe('PROJ-3')
  })

  it('sorts multiple entries alphabetically by source identifier (localeCompare)', () => {
    const rels = [
      mkRel('c', 'b', 'finish-to-start', 0),
      mkRel('a', 'b', 'start-to-start', 0),
      mkRel('d', 'b', 'finish-to-finish', 0)
    ]
    const sources = new Map<Ref<Issue>, Issue>([
      ['a' as Ref<Issue>, mkIssue('a', 'PROJ-2')],
      ['c' as Ref<Issue>, mkIssue('c', 'PROJ-5')],
      ['d' as Ref<Issue>, mkIssue('d', 'PROJ-3')]
    ])
    const out = sortPredecessorsByIdentifier(rels, sources)
    expect(out.map(e => e.source.identifier)).toEqual(['PROJ-2', 'PROJ-3', 'PROJ-5'])
  })

  it('uses numeric-aware ordering so PROJ-2 < PROJ-10', () => {
    const rels = [
      mkRel('x', 'b', 'finish-to-start', 0),
      mkRel('y', 'b', 'finish-to-start', 0)
    ]
    const sources = new Map<Ref<Issue>, Issue>([
      ['x' as Ref<Issue>, mkIssue('x', 'PROJ-10')],
      ['y' as Ref<Issue>, mkIssue('y', 'PROJ-2')]
    ])
    const out = sortPredecessorsByIdentifier(rels, sources)
    expect(out.map(e => e.source.identifier)).toEqual(['PROJ-2', 'PROJ-10'])
  })

  it('filters orphan relations whose source issue is missing from the map', () => {
    const rels = [
      mkRel('a', 'b', 'finish-to-start', 0),
      mkRel('ghost', 'b', 'finish-to-start', 0)
    ]
    const sources = new Map<Ref<Issue>, Issue>([
      ['a' as Ref<Issue>, mkIssue('a', 'PROJ-3')]
    ])
    const out = sortPredecessorsByIdentifier(rels, sources)
    expect(out).toHaveLength(1)
    expect(out[0].source.identifier).toBe('PROJ-3')
  })
})

describe('splitFirstAndRest', () => {
  function mkEntry (identifier: string): PredecessorEntry {
    return {
      rel: mkRel('a', 'b', 'finish-to-start', 0),
      source: mkIssue('a', identifier)
    }
  }

  it('empty -> first=null, rest=[], extraCount=0', () => {
    expect(splitFirstAndRest([])).toEqual({ first: null, rest: [], extraCount: 0 })
  })

  it('single entry -> first=entry, rest=[], extraCount=0', () => {
    const e = mkEntry('PROJ-3')
    const out = splitFirstAndRest([e])
    expect(out.first).toBe(e)
    expect(out.rest).toEqual([])
    expect(out.extraCount).toBe(0)
  })

  it('three entries -> first=entry0, rest=[entry1,entry2], extraCount=2', () => {
    const e0 = mkEntry('PROJ-2')
    const e1 = mkEntry('PROJ-3')
    const e2 = mkEntry('PROJ-5')
    const out = splitFirstAndRest([e0, e1, e2])
    expect(out.first).toBe(e0)
    expect(out.rest).toEqual([e1, e2])
    expect(out.extraCount).toBe(2)
  })
})
