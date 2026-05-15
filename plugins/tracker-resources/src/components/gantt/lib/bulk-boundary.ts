//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation, WorkingDaysConfig } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { fsAnchor, ssAnchor, ffAnchor, sfAnchor } from './working-days'
import { detectCycle } from './scheduler'

/**
 *  — Bulk-Select + Bulk-Drag.
 *
 * Computes the shared `[min, max]` Δ-window in milliseconds that the
 * common drag-delta is allowed to roam without any member of the bulk
 * selection violating a *predecessor* dependency constraint.
 *
 * Spec §"Drag-Boundary": Hard-Stop entire group as soon as one member
 * would breach a constraint, so the relative arrangement stays intact and
 * the resulting cascade stays predictable.
 *
 * What it does **not** check:
 *   - Successor constraints. Pushing a successor is a normal cascade
 *     outcome — the scheduler handles it. Clamping there would block the
 *     primary intent of "drag right by N days".
 *   - Project-start / today boundaries. Huly has no project-start
 *     property today; pre-historic dates were always reachable via
 *     single-bar drag. Bulk should not regress that.
 *   - Manual-mode of the predecessor. A Manual predecessor is still a
 *     date-bearing issue and its anchor is still binding. The decision
 *     whether to *move* the predecessor lives in `simulateCascade`.
 *
 * Bail-out: if the relation graph is cyclic, the function returns
 * unbounded — `simulateCascade` will surface the cycle on commit. Doing
 * the boundary math on a cyclic graph would be unsound (DFS could double-
 * count) and the cascade is going to refuse to commit either way.
 */
export interface BulkDeltaBounds {
  /** Inclusive minimum Δ in ms the drag may apply (most-negative). */
  minDeltaMs: number
  /** Inclusive maximum Δ in ms the drag may apply (most-positive). */
  maxDeltaMs: number
}

export function computeBulkDeltaBounds (
  memberIds: ReadonlySet<Ref<Issue>>,
  allIssues: ReadonlyArray<Issue>,
  relations: ReadonlyArray<IssueRelation>,
  workingDays?: WorkingDaysConfig
): BulkDeltaBounds {
  // Cyclic-graph bail-out (see header). Mirrors simulateCascade's Step 0.
  if (detectCycle(relations as IssueRelation[]) !== null) {
    return { minDeltaMs: -Infinity, maxDeltaMs: Infinity }
  }

  if (memberIds.size === 0) {
    return { minDeltaMs: -Infinity, maxDeltaMs: Infinity }
  }

  const issuesByRef = new Map<Ref<Issue>, Issue>()
  for (const i of allIssues) issuesByRef.set(i._id, i)

  // Group every relation by its target so we can look up incoming
  // (predecessor) edges per member in O(1).
  const byTarget = new Map<Ref<Issue>, IssueRelation[]>()
  for (const r of relations) {
    const bucket = byTarget.get(r.target)
    if (bucket === undefined) byTarget.set(r.target, [r])
    else bucket.push(r)
  }

  let minDeltaMs = -Infinity
  let maxDeltaMs = Infinity

  for (const memberId of memberIds) {
    const member = issuesByRef.get(memberId)
    if (member === undefined) continue
    if (member.startDate == null || member.dueDate == null) continue
    const memberStart = member.startDate as number
    const memberDue = member.dueDate as number

    const incoming = byTarget.get(memberId) ?? []
    for (const r of incoming) {
      // A predecessor that is itself part of the bulk-selection moves
      // along by the same Δ, so its constraint cannot pinch the group.
      if (memberIds.has(r.attachedTo)) continue
      const pred = issuesByRef.get(r.attachedTo)
      if (pred === undefined) continue
      if (pred.startDate == null || pred.dueDate == null) continue
      const predStart = pred.startDate as number
      const predDue = pred.dueDate as number
      const lag = r.lag ?? 0

      // For each kind, compute the constraint-driven minimum of the
      // member's anchor side, then translate it into the Δ that would
      // bring the member exactly to that boundary.
      let memberAnchor: number
      let requiredAnchor: number
      if (r.kind === 'finish-to-start') {
        requiredAnchor = fsAnchor(predDue, lag, workingDays)
        memberAnchor = memberStart
      } else if (r.kind === 'start-to-start') {
        requiredAnchor = ssAnchor(predStart, lag, workingDays)
        memberAnchor = memberStart
      } else if (r.kind === 'finish-to-finish') {
        requiredAnchor = ffAnchor(predDue, lag, workingDays)
        memberAnchor = memberDue
      } else /* start-to-finish */ {
        requiredAnchor = sfAnchor(predStart, lag, workingDays)
        memberAnchor = memberDue
      }

      // Slack-to-pred in ms: how far the member's anchor sits past the
      // earliest allowed position. Always >= 0 when the current schedule
      // satisfies the constraint; negative if the user-pinned dates
      // already violate it (in which case the drag must not push the
      // member further into the red — minDelta = 0).
      const slack = memberAnchor - requiredAnchor
      const memberMinDelta = slack >= 0 ? -slack : 0
      if (memberMinDelta > minDeltaMs) minDeltaMs = memberMinDelta
    }
  }

  return { minDeltaMs, maxDeltaMs }
}
