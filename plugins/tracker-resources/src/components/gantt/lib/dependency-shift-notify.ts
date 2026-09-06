//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Notification on Dependency-Shift.
 *
 * Pure aggregation helpers that turn the in-memory cascade result
 * (`PrimaryEdit[]` + `CascadeShift[]`) into a per-recipient `ShiftedIssuePayload`
 * bundle suitable for `DependencyShiftedNotification`. Side-effect free, so
 * unit tests can drive the grouping without spinning up the platform.
 *
 * The actual send happens in `dependency-shift-send.ts` (which depends on the
 * client) — keeping the math here keeps the test surface small.
 */

import type { AccountUuid, Ref } from '@hcengineering/core'
import { type Issue, type ShiftedIssuePayload, groupShiftsByRecipient } from '@hcengineering/tracker'
import type { CascadeShift, PrimaryEdit } from './types'

// Re-export the pure recipient-grouping helper. The single source of truth now
// lives in `@hcengineering/tracker` so the server-side dispatch trigger
// (`OnDependencyShiftRequest`) and this client module share identical logic
// without divergence. Existing call sites / tests keep importing it from here.
export { groupShiftsByRecipient }

/**
 * Build a `ShiftedIssuePayload` entry from a primary edit. Only the issue
 * identity is carried: the notification names which issues moved, never a
 * client-reported date or delta (which the server cannot verify after the
 * cascade has committed). The trigger issue itself is included so the recipient
 * gets the full picture (the bundle filters out the trigger entry on the
 * recipient side when needed).
 */
export function buildPayloadFromPrimary (pe: PrimaryEdit): ShiftedIssuePayload {
  return {
    issueId: pe.issue._id,
    identifier: pe.issue.identifier,
    title: pe.issue.title
  }
}

/**
 * Build a `ShiftedIssuePayload` entry from a cascade shift. As with the primary
 * builder, only the issue identity travels — no date or delta.
 */
export function buildPayloadFromShift (sh: CascadeShift): ShiftedIssuePayload {
  return {
    issueId: sh.issue._id,
    identifier: sh.issue.identifier,
    title: sh.issue.title
  }
}

/**
 * Convenience: combine the two builders + grouping into one call. Returns the
 * per-recipient bundle map ready for `dependency-shift-send.ts` to dispatch.
 */
export function buildRecipientBundles (
  triggerUserId: AccountUuid | undefined,
  primaries: PrimaryEdit[],
  shifts: CascadeShift[],
  collaboratorsByIssue: Map<Ref<Issue>, AccountUuid[]>
): Map<AccountUuid, ShiftedIssuePayload[]> {
  const entries: ShiftedIssuePayload[] = [
    ...primaries.map(buildPayloadFromPrimary),
    ...shifts.map(buildPayloadFromShift)
  ]
  return groupShiftsByRecipient(triggerUserId, entries, collaboratorsByIssue)
}
