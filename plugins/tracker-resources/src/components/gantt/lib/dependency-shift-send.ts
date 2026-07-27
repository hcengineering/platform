//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Notification on Dependency-Shift.
 *
 * Client-side signal emitter: takes a freshly-committed cascade result and
 * writes a single `DependencyShiftRequest` doc into the *project* space the
 * user already edits. The send runs after `ops.commit()` succeeds in
 * `GanttView.svelte:commitCascadeBatch` (and the alt-bypass + no-cascade-with-
 * shifts code paths), so a failed commit never produces a phantom request.
 *
 * Architecture (security):
 *
 *  - The client NO LONGER writes `DocNotifyContext`/`DependencyShiftedNotification`
 *    directly into recipients' `PersonSpace`s. That was a spoofing/ACL hazard:
 *    a client could forge inbox notifications with an arbitrary `triggerUserId`
 *    into foreign spaces. Instead the server trigger `OnDependencyShiftRequest`
 *    resolves collaborators + recipient spaces privileged and derives the
 *    trigger user from `tx.modifiedBy` (never from the payload).
 *
 *  - Only the pure per-issue payload construction (`buildPayloadFrom*`) stays
 *    client-side; the collaborator/space resolution and the notification writes
 *    moved into the server trigger.
 *
 *  - The payload is a *request*, not the notification content. It carries only
 *    the ids of the shifted issues (plus identifier/title for logging). The
 *    trigger re-reads every referenced issue from storage, restricted to the
 *    request's own space, and rebuilds identifier and title from those docs — so
 *    an id naming a foreign or non-existent issue is dropped rather than
 *    delivered. No dates or deltas travel in the payload: the pre-shift dates no
 *    longer exist server-side once the cascade is committed, so an unverifiable
 *    delta is never shown; the authentic new dates live on the issues.
 */

import { type AccountUuid, type TxOperations } from '@hcengineering/core'
import tracker, { type Issue, type ShiftedIssuePayload } from '@hcengineering/tracker'
import type { CascadeShift, PrimaryEdit } from './types'
import { buildPayloadFromPrimary, buildPayloadFromShift } from './dependency-shift-notify'

/**
 * Input arguments for one cascade-commit send. `triggerIssue` is the primary
 * the user actually dragged (the notification subject). `triggerUser` is
 * accepted for call-site compatibility but is intentionally ignored on the
 * client — the server derives the trigger user from the request's Tx author
 * (anti-spoofing), so a client-supplied value is never trusted.
 */
export interface DependencyShiftSendArgs {
  triggerIssue: Issue
  triggerUser: AccountUuid
  primaries: PrimaryEdit[]
  shifts: CascadeShift[]
  cascadeToken: string
}

/**
 * Fire-and-forget request emit. Returns 1 if a `DependencyShiftRequest` doc was
 * written (there was at least one shifted issue), 0 otherwise. Errors are
 * caught and surfaced via the optional `onError` hook so the cascade commit
 * itself is never rolled back by a notification glitch.
 *
 * Degrades silently when the workspace model does not know
 * `DependencyShiftRequest`. A workspace that has not been migrated to the
 * model version introducing that class would otherwise fail on every single
 * cascade commit — the date shift itself has already been committed
 * successfully at this point, so a failure here must never surface as an
 * error to the user. The notification is best-effort by design.
 */
export async function sendDependencyShiftedNotifications (
  client: TxOperations,
  args: DependencyShiftSendArgs,
  onError?: (err: unknown) => void
): Promise<number> {
  try {
    // Model guard — see the doc comment above. Checked before the payload is
    // built so an un-migrated workspace does no work at all.
    if (!client.getHierarchy().hasClass(tracker.class.DependencyShiftRequest)) {
      return 0
    }

    const shiftedIssues: ShiftedIssuePayload[] = [
      ...args.primaries.map(buildPayloadFromPrimary),
      ...args.shifts.map(buildPayloadFromShift)
    ]
    if (shiftedIssues.length === 0) return 0

    await client.createDoc(tracker.class.DependencyShiftRequest, args.triggerIssue.space, {
      triggerIssueId: args.triggerIssue._id,
      triggerIssueIdentifier: args.triggerIssue.identifier,
      triggerIssueTitle: args.triggerIssue.title,
      triggerIssueSpace: args.triggerIssue.space,
      shiftedIssues,
      cascadeToken: args.cascadeToken
    })
    return 1
  } catch (err) {
    if (onError !== undefined) onError(err)
    return 0
  }
}
