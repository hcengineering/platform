//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Class, Doc, Ref } from '@hcengineering/core'
import type { Issue, IssueRelation } from '@hcengineering/tracker'

/**
 * Minimal projection of the DocUpdateMessage shape this migration touches.
 * Decoupled from `@hcengineering/activity` to keep the helper unit-testable
 * without spinning up the full activity model. The migration entry in
 * `models/tracker/src/migration.ts` keeps its own inline copy of the
 * predicate (cannot import across package layers — models/tracker is
 * below tracker-resources).
 */
export interface RelationDum {
  _id: Ref<Doc>
  objectId: Ref<IssueRelation>
  objectClass: Ref<Class<Doc>>
  action: 'create' | 'update' | 'remove'
  attachedTo: Ref<Doc>
  attachedToClass: Ref<Class<Doc>>
  updateCollection?: string
  txId?: Ref<Doc>
}

/**
 * Minimal projection of the original TxCreateDoc for an IssueRelation.
 * Contains the parent-issue link we use to repair broken DUMs.
 */
export interface RelationCreateTx {
  _id: Ref<Doc>
  _class: Ref<Class<Doc>> // expected to be core.class.TxCreateDoc
  objectId: Ref<IssueRelation>
  attachedTo?: Ref<Issue>
  attachedToClass?: Ref<Class<Doc>>
  collection?: string
}

const TRACKER_ISSUE_CLASS = 'tracker:class:Issue' as Ref<Class<Doc>>

/**
 * A DocUpdateMessage is "broken" — and the activity feed shows an empty
 * `removed related to:` row — when `removeDoc` was used instead of
 * `removeCollection`. In that case the message ends up attached to the
 * removed IssueRelation itself (or any non-Issue class), with no
 * `updateCollection` slot, so the issue-side activity panel never sees it
 * as a collection event.
 *
 * The predicate is intentionally permissive on `objectClass` (the caller
 * pre-filters by tracker.class.IssueRelation) but strict on the
 * symptom: action === 'remove' AND (attachedToClass !== Issue OR no
 * updateCollection).
 */
export function isBrokenRelationDum (msg: RelationDum): boolean {
  if (msg.action !== 'remove') return false
  if (msg.attachedToClass !== TRACKER_ISSUE_CLASS) return true
  if (msg.updateCollection !== 'relations') return true
  return false
}

/**
 * Build the `{ attachedTo, attachedToClass, updateCollection }` patch the
 * migration writes onto a broken DUM, by combining its own objectId with
 * the original TxCreateDoc of the now-removed IssueRelation. The
 * TxCreateDoc must be searched by `objectId === dum.objectId`.
 *
 * Returns `undefined` when the create-tx is missing — caller writes a
 * placeholder in that case (best-effort migration, per spec).
 */
export function patchFromTxes (
  _dum: RelationDum,
  createTx: RelationCreateTx | undefined
): { attachedTo: Ref<Issue>, attachedToClass: Ref<Class<Doc>>, updateCollection: string } | undefined {
  if (createTx === undefined) return undefined
  if (createTx.attachedTo === undefined || createTx.attachedToClass === undefined) return undefined
  return {
    attachedTo: createTx.attachedTo,
    attachedToClass: createTx.attachedToClass,
    updateCollection: createTx.collection ?? 'relations'
  }
}
