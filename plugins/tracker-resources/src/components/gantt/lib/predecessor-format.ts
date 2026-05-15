//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation, DependencyKind } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

/**
 * Two-letter display codes for the four DependencyKind values. Used in the
 * sidebar predecessor column, the dependency-arrow tooltip, and the
 * DependencyEditor dropdown labels. NEVER persisted — the long-form
 * 'finish-to-start' etc. is what reaches CockroachDB. See spec §1 / §4.
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
 * gets unreadable if every entry has a +0d). Spec §5.
 */
export function signedLag (lag: number): string {
  if (lag === 0) return ''
  if (lag > 0) return `+${lag}d`
  return `${lag}d`
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
