//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation, DependencyKind } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { LayoutRow } from './types'

/**
 * Two-letter display codes for the four DependencyKind values. Used in the
 * sidebar predecessor column, the dependency-arrow tooltip, and the
 * DependencyEditor dropdown labels. NEVER persisted — the long-form
 * 'finish-to-start' etc. is what reaches the database.
 */
const KIND_TO_CODE: Record<DependencyKind, 'FS' | 'SS' | 'FF' | 'SF'> = {
  'finish-to-start': 'FS',
  'start-to-start': 'SS',
  'finish-to-finish': 'FF',
  'start-to-finish': 'SF'
}
const CODE_TO_KIND: Record<'FS' | 'SS' | 'FF' | 'SF', DependencyKind> = {
  FS: 'finish-to-start',
  SS: 'start-to-start',
  FF: 'finish-to-finish',
  SF: 'start-to-finish'
}

export function kindCode (kind: DependencyKind): 'FS' | 'SS' | 'FF' | 'SF' {
  return KIND_TO_CODE[kind]
}

export function kindFromCode (code: 'FS' | 'SS' | 'FF' | 'SF'): DependencyKind {
  return CODE_TO_KIND[code]
}

/**
 * "+2d" for positive lag, "-1d" for negative, "" for zero (the column
 * gets unreadable if every entry has a +0d).
 */
export function signedLag (lag: number): string {
  if (lag === 0) return ''
  if (lag > 0) return `+${lag}d`
  return `${lag}d`
}

/**
 * Compact form of an issue identifier for the predecessor column: the project
 * prefix is stripped so the notation stays short, matching MS Project / Asana
 * conventions ("PROJ-12" → "12").
 */
export function compactIssueNumber (identifier: string | undefined): string {
  return (identifier ?? '').replace(/^[A-Z]+-/, '')
}

/**
 * Resolve the compact predecessor number of `ref`.
 *
 * The identifier must NOT depend on whether the predecessor happens to have a
 * row right now: a predecessor can be filtered out, collapsed under a parent,
 * or in another group lane, and dropping its number would turn "12FS+2d" into
 * a meaningless "FS+2d". So the lookup goes against the full loaded issue set
 * first (`identifiers`, keyed by `Ref<Issue>`) and only falls back to the
 * visible `rows` — the fallback matters for callers such as fixtures and tests
 * that render rows without supplying the map.
 */
export function resolveIssueNumber (
  ref: Ref<Issue>,
  identifiers: ReadonlyMap<Ref<Issue>, string>,
  rows: readonly LayoutRow[]
): string {
  const known = identifiers.get(ref)
  if (known !== undefined) return compactIssueNumber(known)
  for (const r of rows) {
    if (r.issue !== null && r.issue._id === ref) {
      return compactIssueNumber((r.issue as unknown as { identifier?: string }).identifier)
    }
  }
  return ''
}

/**
 * Render the predecessor notation for an issue, e.g. "12FS+2d, 15SS-1d".
 * Predecessors of `issue` = relations whose `.target === issue._id`. The
 * displayed identifier is the source (`relation.attachedTo`), not the
 * target — predecessor identifier is the upstream side of the edge.
 */
export function formatPredecessors (
  issue: Issue,
  relations: IssueRelation[],
  issueNumberOf: (ref: Ref<Issue>) => string
): string {
  const out: string[] = []
  for (const r of relations) {
    if (r.target !== issue._id) continue
    out.push(`${issueNumberOf(r.attachedTo)}${kindCode(r.kind)}${signedLag(r.lag)}`)
  }
  return out.join(', ')
}
