//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { kindCode, signedLag } from './predecessor-format'

/**
 * One row of the Tracker-list predecessor column: the IssueRelation edge
 * paired with its resolved source Issue (= the upstream / predecessor).
 *
 * Why a struct and not a tuple: the Svelte template reads
 * `entry.source.identifier` and `entry.rel.kind` independently — a
 * named field is easier to follow than `entry[0]/entry[1]`.
 */
export interface PredecessorEntry {
  rel: IssueRelation
  source: Issue
}

/**
 * Render the column-cell notation for one predecessor.
 * Format: '<identifier> <kindCode><signedLag>' e.g. 'PROJ-3 FS+2d'.
 * Zero lag drops the '+0d' suffix (see signedLag).
 *
 * Decoupled from `formatPredecessors` (gantt sidebar/tooltips) because
 * the list column wants ONE entry at a time — formatPredecessors joins
 * the full set with ', ' which the column never renders.
 */
export function formatPredecessorEntry (rel: IssueRelation, source: Issue): string {
  return `${(source as unknown as { identifier: string }).identifier} ${kindCode(rel.kind)}${signedLag(rel.lag)}`
}

/**
 * Map IssueRelation[] to PredecessorEntry[] sorted by source identifier
 * (numeric-aware so PROJ-2 < PROJ-10, not PROJ-10 < PROJ-2 as plain
 * string-compare would have it).
 *
 * Orphan relations (source Issue missing from the map — e.g. deleted
 * upstream issue) are silently dropped: the cell still renders the
 * remaining valid predecessors instead of showing a broken '???' row.
 */
export function sortPredecessorsByIdentifier (
  rels: IssueRelation[],
  sources: Map<Ref<Issue>, Issue>
): PredecessorEntry[] {
  const entries: PredecessorEntry[] = []
  for (const rel of rels) {
    const source = sources.get(rel.attachedTo as Ref<Issue>)
    if (source === undefined) continue
    entries.push({ rel, source })
  }
  entries.sort((a, b) => {
    const idA = (a.source as unknown as { identifier: string }).identifier
    const idB = (b.source as unknown as { identifier: string }).identifier
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
  })
  return entries
}

/**
 * Split the sorted predecessor list into the head (rendered inline in
 * the cell) and the tail (shown only in the '+N more' tooltip).
 *
 * Spec: 'erste sichtbar + +N more-Indicator'. The threshold is 1 —
 * even two predecessors get a +1 more badge rather than rendering
 * both inline; the cell would otherwise blow the row height.
 */
export function splitFirstAndRest (sorted: PredecessorEntry[]): {
  first: PredecessorEntry | null
  rest: PredecessorEntry[]
  extraCount: number
} {
  if (sorted.length === 0) return { first: null, rest: [], extraCount: 0 }
  const [first, ...rest] = sorted
  return { first, rest, extraCount: rest.length }
}
