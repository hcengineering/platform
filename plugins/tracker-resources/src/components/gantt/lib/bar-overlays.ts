//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Pure overlay predicates used by GanttBar to decide whether to
// render the past-due stripe / blocked hatch overlays.
//
// Naming: `isPastDue` (not `isOverdue`) — Huly already exports
// `isOverdue(issue): boolean` in ./deadline-marker.ts with the
// semantics `dueDate > deadline`. To avoid the collision we use a
// different name; the user-facing UI label remains "Overdue" because
// that is the term users actually use.
//
import type { Ref } from '@hcengineering/core'
import type { Issue, IssueStatus } from '@hcengineering/tracker'
import type { GanttBarIssueLike } from './bar-colors'

/**
 * Callers MUST guard for `status === undefined` before invoking this lookup.
 * Both `isPastDue` (status guard) and `resolveBarColors` (status guard in
 * the 'status' branch) already do; keeping the signature non-optional lets
 * test fixtures and live callbacks stay narrowly typed under TS strict.
 */
export type StatusCategoryLookup = (id: Ref<IssueStatus>) => string | null

/**
 * True iff the bar's issue has a dueDate strictly in the past AND its
 * status category is not `task:statusCategory:Won` (Done). The boundary
 * value `dueDate === now` is NOT past-due — work completed today counts
 * as on time.
 *
 * Takes GanttBarIssueLike (not Issue) so synthetic milestone-summary
 * bars don't trigger a false past-due hatch — those have no `status`
 * field, and an old milestone is not a past-due issue. When `status`
 * is undefined we return false.
 */
export function isPastDue (issue: GanttBarIssueLike, statusCategoryFor: StatusCategoryLookup, now: number): boolean {
  if (issue.dueDate == null) return false
  if (issue.dueDate >= now) return false
  if (issue.status === undefined) return false // synthetic milestone-summary bar
  return statusCategoryFor(issue.status) !== 'task:statusCategory:Won'
}

/**
 * True iff at least one FS predecessor of the issue has a known status
 * category and is NOT Won (Done). Unknown predecessor status (no entry
 * in the map) is treated conservatively as "don't paint a hatch on
 * uncertain data".
 *
 * Map keys are stringified Refs to dodge symbol-identity flakiness across
 * Svelte rerenders — all callers stringify on the way in.
 */
export function isBlocked (
  _issue: GanttBarIssueLike,
  predecessorIds: ReadonlyArray<Ref<Issue>>,
  predStatusOf: ReadonlyMap<string, Ref<IssueStatus>>,
  statusCategoryFor: StatusCategoryLookup
): boolean {
  for (const predId of predecessorIds) {
    const sid = predStatusOf.get(String(predId))
    if (sid === undefined) continue
    const cat = statusCategoryFor(sid)
    if (cat == null) continue
    if (cat !== 'task:statusCategory:Won') return true
  }
  return false
}
