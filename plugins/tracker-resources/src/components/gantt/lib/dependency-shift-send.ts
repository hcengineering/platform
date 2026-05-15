//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Tier-4 Item 14 — Notification on Dependency-Shift.
 *
 * Client-side dispatcher: takes a freshly-committed cascade result and emits
 * one `DependencyShiftedNotification` per (non-trigger) recipient. The send
 * runs after `ops.commit()` succeeds in `GanttView.svelte:commitCascadeBatch`
 * (and the alt-bypass + no-cascade-with-shifts code paths), so a failed
 * commit never produces a phantom notification.
 *
 * Architecture notes:
 *
 *  - The bundle does NOT go through the server-side `pushInboxNotifications`
 *    pipeline because that pipeline is keyed off TxCUD context for the
 *    *originating* doc — we'd lose the trigger-user / cascade-set context.
 *    Creating the notification doc directly is the simplest path that keeps
 *    the bundle payload intact end-to-end.
 *
 *  - Suppression of the auto-generated `dueDate` notification (spec §3.3) is
 *    a Known Limitation in v1: `TxApplyIf.scope` (= `cascadeToken`) is
 *    consumed inside `ApplyTxMiddleware` before the trigger pipeline sees
 *    the inner Txes, so a server-side trigger cannot tell a cascade update
 *    apart from a manual edit. Follow-up: surface the cascade-token through
 *    a trigger-visible attribute or wrap the cascade Tx in a custom Tx-mixin.
 *
 *  - The `DocNotifyContext` that normally accompanies an inbox notification
 *    is intentionally omitted in v1; the recipient sees the entry in their
 *    inbox via the `user` + `space` routing keys on the notification
 *    itself, which is the same path `MentionInboxNotification` relies on.
 */

import contact, { type Employee, type PersonSpace } from '@hcengineering/contact'
import core, {
  type AccountUuid,
  type Doc,
  type Ref,
  type Space,
  type TxOperations,
  generateId
} from '@hcengineering/core'
import notification, { type DocNotifyContext } from '@hcengineering/notification'
import tracker, { type Issue, type ShiftedIssuePayload } from '@hcengineering/tracker'
import type { CascadeShift, PrimaryEdit } from './types'
import { buildRecipientBundles } from './dependency-shift-notify'

/**
 * Input arguments for one cascade-commit send. The `triggerUser` is the
 * account-uuid of the user who initiated the cascade (typically the result
 * of `getCurrentAccount().uuid` on the call site); `triggerIssue` is the
 * primary the user actually dragged (used as the notification subject).
 */
export interface DependencyShiftSendArgs {
  triggerIssue: Issue
  triggerUser: AccountUuid
  primaries: PrimaryEdit[]
  shifts: CascadeShift[]
  cascadeToken: string
}

/**
 * Resolve the per-issue collaborator list. Reads `core.class.Collaborator`
 * attached to each shifted issue. Issues with no Collaborator doc yet (newly
 * created, no one ever opened them) fall back to their `assignee` field —
 * matching the server-side `getDocCollaborators` behaviour.
 */
async function collectCollaborators (
  client: TxOperations,
  issues: Issue[]
): Promise<Map<Ref<Issue>, AccountUuid[]>> {
  const map = new Map<Ref<Issue>, AccountUuid[]>()
  if (issues.length === 0) return map

  const issueIds = Array.from(new Set(issues.map((i) => i._id)))
  const collabs = await client.findAll(core.class.Collaborator, {
    attachedTo: { $in: issueIds as Ref<Doc>[] }
  })
  for (const c of collabs) {
    const target = c.attachedTo as Ref<Issue>
    const bucket = map.get(target)
    if (bucket === undefined) {
      map.set(target, [c.collaborator])
    } else if (!bucket.includes(c.collaborator)) {
      bucket.push(c.collaborator)
    }
  }

  // Fallback: any issue without Collaborator docs maps to its assignee's
  // account-uuid. The assignee is stored as `Ref<Person>` on Issue; we need
  // to resolve to AccountUuid via the Employee mixin's `personUuid` field.
  const missing = issues.filter((i) => !map.has(i._id) && i.assignee != null)
  if (missing.length > 0) {
    const employees = await client.findAll(
      contact.mixin.Employee,
      { _id: { $in: missing.map((i) => i.assignee as Ref<Employee>) } },
      { projection: { _id: 1, personUuid: 1 } }
    )
    const byEmpId = new Map(employees.map((e) => [e._id, e.personUuid]))
    for (const i of missing) {
      const acc = byEmpId.get(i.assignee as Ref<Employee>)
      if (acc != null) map.set(i._id, [acc])
    }
  }

  return map
}

/**
 * Resolve recipient AccountUuid → PersonSpace mapping. The `Doc.space` on the
 * `DependencyShiftedNotification` MUST be the recipient's `PersonSpace` (same
 * routing key the server-side notification pipeline uses), so the inbox view
 * picks up the entry for that user only.
 *
 * Recipients without an active Employee record (rare: deactivated user still
 * appearing on collaborators) silently drop out — sending to a non-existent
 * PersonSpace would raise a server-side ACL error.
 */
async function resolveRecipientSpaces (
  client: TxOperations,
  recipients: AccountUuid[]
): Promise<Map<AccountUuid, Ref<PersonSpace>>> {
  const map = new Map<AccountUuid, Ref<PersonSpace>>()
  if (recipients.length === 0) return map

  const employees = await client.findAll(
    contact.mixin.Employee,
    { personUuid: { $in: recipients }, active: true },
    { projection: { _id: 1, personUuid: 1 } }
  )
  if (employees.length === 0) return map

  const spaces = await client.findAll(
    contact.class.PersonSpace,
    { person: { $in: employees.map((e) => e._id) } },
    { projection: { _id: 1, person: 1 } }
  )
  const spaceByPerson = new Map(spaces.map((s) => [s.person, s._id]))
  for (const e of employees) {
    if (e.personUuid == null) continue
    const space = spaceByPerson.get(e._id)
    if (space != null) map.set(e.personUuid, space)
  }
  return map
}

/**
 * Fire-and-forget bundle send. Returns the number of notifications actually
 * created — callers can log it to verify the cascade reached the right user
 * count. Errors are caught and surfaced via the optional `onError` hook so
 * the cascade commit itself is not rolled back by a notification glitch.
 */
export async function sendDependencyShiftedNotifications (
  client: TxOperations,
  args: DependencyShiftSendArgs,
  onError?: (err: unknown) => void
): Promise<number> {
  try {
    const allIssues: Issue[] = [
      ...args.primaries.map((p) => p.issue),
      ...args.shifts.map((s) => s.issue)
    ]
    if (allIssues.length === 0) return 0

    const collaborators = await collectCollaborators(client, allIssues)
    const bundles = buildRecipientBundles(args.triggerUser, args.primaries, args.shifts, collaborators)
    if (bundles.size === 0) return 0

    const spaces = await resolveRecipientSpaces(client, Array.from(bundles.keys()))
    if (spaces.size === 0) return 0

    let created = 0
    for (const [recipient, shiftedIssues] of bundles) {
      const space = spaces.get(recipient)
      if (space === undefined) continue
      await createOneBundle(client, space, recipient, shiftedIssues, args)
      created += 1
    }
    return created
  } catch (err) {
    if (onError !== undefined) onError(err)
    return 0
  }
}

async function createOneBundle (
  client: TxOperations,
  space: Ref<PersonSpace>,
  recipient: AccountUuid,
  shiftedIssues: ShiftedIssuePayload[],
  args: DependencyShiftSendArgs
): Promise<void> {
  // First make sure there is a DocNotifyContext for this recipient + trigger
  // issue. Without it the inbox UI can't open the notification's target view.
  // We reuse the existing context if there is one (the recipient may have
  // had previous activity on this issue), otherwise create a fresh one.
  const existingContext = await client.findOne(notification.class.DocNotifyContext, {
    objectId: args.triggerIssue._id,
    user: recipient
  })

  let contextId: Ref<DocNotifyContext>
  if (existingContext !== undefined) {
    contextId = existingContext._id
    // Bump the context's lastUpdateTimestamp so the inbox sorts the new
    // notification to the top (matches `pushInboxNotifications` behaviour).
    await client.updateDoc(existingContext._class, existingContext.space, existingContext._id, {
      hidden: false,
      lastUpdateTimestamp: Date.now()
    })
  } else {
    contextId = generateId<DocNotifyContext>()
    await client.createDoc(
      notification.class.DocNotifyContext,
      space as unknown as Ref<Space>,
      {
        user: recipient,
        objectId: args.triggerIssue._id,
        objectClass: tracker.class.Issue,
        objectSpace: args.triggerIssue.space,
        hidden: false,
        isPinned: false,
        lastUpdateTimestamp: Date.now()
      },
      contextId
    )
  }

  await client.createDoc(
    tracker.class.DependencyShiftedNotification,
    space as unknown as Ref<Space>,
    {
      user: recipient,
      isViewed: false,
      docNotifyContext: contextId,
      objectId: args.triggerIssue._id,
      objectClass: tracker.class.Issue,
      archived: false,
      // CommonInboxNotification routing
      header: tracker.string.DependencyShiftedHeader,
      message: tracker.string.DependencyShiftedMessage,
      intlParams: {
        count: shiftedIssues.length,
        trigger: args.triggerIssue.identifier
      },
      // DependencyShiftedNotification payload
      triggerIssueId: args.triggerIssue._id,
      triggerIssueIdentifier: args.triggerIssue.identifier,
      triggerIssueTitle: args.triggerIssue.title,
      triggerUserId: args.triggerUser,
      shiftedIssues,
      cascadeToken: args.cascadeToken
    }
  )
}
