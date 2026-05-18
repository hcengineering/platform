//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 *  — Notification on Dependency-Shift.
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
import type { Issue, ShiftedIssuePayload } from '@hcengineering/tracker'
import type { CascadeShift, PrimaryEdit } from './types'

/**
 * Build a `ShiftedIssuePayload` entry from a primary edit. The trigger issue
 * itself is included so the recipient gets the full picture (the bundle will
 * filter out the trigger entry on the recipient side when needed).
 */
export function buildPayloadFromPrimary (pe: PrimaryEdit): ShiftedIssuePayload {
  const oldStart = pe.issue.startDate ?? null
  const newStart = pe.newStart
  const oldDue = pe.issue.dueDate ?? null
  const newDue = pe.newDue

  // Prefer the dueDate-delta for the headline number: it is the user-visible
  // schedule anchor in 99% of cascade scenarios (push-successor preserves
  // duration). Fall back to startDate-delta if dueDate is unset on both ends.
  let deltaMs = 0
  if (oldDue != null) {
    deltaMs = newDue - oldDue
  } else if (oldStart != null) {
    deltaMs = newStart - oldStart
  }

  return {
    issueId: pe.issue._id,
    identifier: pe.issue.identifier,
    title: pe.issue.title,
    deltaMs,
    oldStart,
    newStart,
    oldDue,
    newDue
  }
}

/**
 * Build a `ShiftedIssuePayload` entry from a cascade shift. The delta is
 * computed against the *recorded* `oldDue` so working-days adjustments are
 * honoured: even if a shift is "+2 calendar days" but the working-days
 * calendar bumped the issue to skip a weekend, the user-visible delta is the
 * actual end-to-end window movement.
 */
export function buildPayloadFromShift (sh: CascadeShift): ShiftedIssuePayload {
  let deltaMs = 0
  if (sh.oldDue !== null && sh.newDue !== null) {
    deltaMs = sh.newDue - sh.oldDue
  } else if (sh.oldStart !== null && sh.newStart !== null) {
    deltaMs = sh.newStart - sh.oldStart
  }
  return {
    issueId: sh.issue._id,
    identifier: sh.issue.identifier,
    title: sh.issue.title,
    deltaMs,
    oldStart: sh.oldStart,
    newStart: sh.newStart,
    oldDue: sh.oldDue,
    newDue: sh.newDue
  }
}

/**
 * Group `ShiftedIssuePayload`s by recipient, given a per-issue collaborator
 * lookup. The trigger user is filtered out from every recipient bundle so
 * the user who initiated the cascade does not get pinged about their own
 * action (matches the "self-suppress" rule in the design spec §6).
 *
 * Returns a `Map` so callers can iterate deterministically (Map iteration is
 * insertion-order, which is what the tests rely on).
 */
export function groupShiftsByRecipient (
  triggerUserId: AccountUuid | undefined,
  entries: ShiftedIssuePayload[],
  collaboratorsByIssue: Map<Ref<Issue>, AccountUuid[]>
): Map<AccountUuid, ShiftedIssuePayload[]> {
  const result = new Map<AccountUuid, ShiftedIssuePayload[]>()

  for (const entry of entries) {
    const collaborators = collaboratorsByIssue.get(entry.issueId) ?? []
    const seenForThisEntry = new Set<AccountUuid>()
    for (const acc of collaborators) {
      if (triggerUserId !== undefined && acc === triggerUserId) continue
      if (seenForThisEntry.has(acc)) continue
      seenForThisEntry.add(acc)
      const bucket = result.get(acc)
      if (bucket === undefined) {
        result.set(acc, [entry])
      } else {
        bucket.push(entry)
      }
    }
  }

  return result
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
