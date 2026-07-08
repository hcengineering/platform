//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { AccessLevel, AccountUuid, Collaborator, Ref } from '@hcengineering/core'
import { type GroupCollabRecord, reconcileGrant, teardownGrant } from '../reconcile'

const acc = (s: string): AccountUuid => s as unknown as AccountUuid
let idSeq = 0
function rec (collaborator: string, level?: AccessLevel, id?: string): GroupCollabRecord {
  return {
    _id: (id ?? `rec-${idSeq++}`) as Ref<Collaborator>,
    collaborator: acc(collaborator),
    level
  }
}

/**
 * Simulate applying a reconcile plan to the current records: drop removed ids,
 * append a fresh record per created member at the desired level. Used to prove
 * idempotency (a second reconcile of the applied state is a no-op).
 */
function applyPlan (
  existing: GroupCollabRecord[],
  members: string[],
  level: AccessLevel,
  plan: { toCreate: AccountUuid[], toRemove: Array<Ref<Collaborator>> }
): GroupCollabRecord[] {
  const next = existing.filter((r) => !plan.toRemove.includes(r._id))
  for (const m of plan.toCreate) next.push(rec(m as unknown as string, level))
  return next
}

describe('reconcileGrant (pure)', () => {
  it('materializes one record per member at the grant level (empty start)', () => {
    const plan = reconcileGrant([acc('a'), acc('b')], 'write', [])
    expect(plan.toCreate.sort()).toEqual([acc('a'), acc('b')])
    expect(plan.toRemove).toEqual([])
  })

  it('is a no-op when every member already has a correct-level record', () => {
    const existing = [rec('a', 'write'), rec('b', 'write')]
    const plan = reconcileGrant([acc('a'), acc('b')], 'write', existing)
    expect(plan.toCreate).toEqual([])
    expect(plan.toRemove).toEqual([])
  })

  it('adds a record for a newly added member, keeps existing', () => {
    const existing = [rec('a', 'read')]
    const plan = reconcileGrant([acc('a'), acc('b')], 'read', existing)
    expect(plan.toCreate).toEqual([acc('b')])
    expect(plan.toRemove).toEqual([])
  })

  it('removes the record of a member that left the group', () => {
    const gone = rec('b', 'read', 'rec-b')
    const existing = [rec('a', 'read'), gone]
    const plan = reconcileGrant([acc('a')], 'read', existing)
    expect(plan.toCreate).toEqual([])
    expect(plan.toRemove).toEqual([gone._id])
  })

  it('re-materializes at a new level (remove old + create new)', () => {
    const old = rec('a', 'read', 'rec-a')
    const plan = reconcileGrant([acc('a')], 'admin', [old])
    expect(plan.toRemove).toEqual([old._id])
    expect(plan.toCreate).toEqual([acc('a')])
  })

  it('collapses duplicate records for the same member to one', () => {
    const keep = rec('a', 'read', 'rec-a1')
    const dup = rec('a', 'read', 'rec-a2')
    const plan = reconcileGrant([acc('a')], 'read', [keep, dup])
    expect(plan.toCreate).toEqual([])
    expect(plan.toRemove).toEqual([dup._id]) // exactly one duplicate removed, first kept
  })

  it('treats a missing level as read (fail-safe): read grant + undefined record = no-op', () => {
    const existing = [rec('a', undefined)]
    const plan = reconcileGrant([acc('a')], 'read', existing)
    expect(plan.toCreate).toEqual([])
    expect(plan.toRemove).toEqual([])
  })

  it('teardownGrant removes every in-scope record', () => {
    const existing = [rec('a', 'read'), rec('b', 'write')]
    const plan = teardownGrant(existing)
    expect(plan.toCreate).toEqual([])
    expect(plan.toRemove.sort()).toEqual(existing.map((r) => r._id).sort())
  })

  // ── idempotency: apply once, re-run must be a no-op for varied scenarios ──
  it.each([
    { members: ['a', 'b', 'c'], level: 'read' as AccessLevel, start: [] as GroupCollabRecord[] },
    { members: ['a'], level: 'admin' as AccessLevel, start: [rec('a', 'read')] },
    { members: ['a', 'b'], level: 'write' as AccessLevel, start: [rec('a', 'write'), rec('z', 'write')] },
    { members: [], level: 'read' as AccessLevel, start: [rec('a', 'read'), rec('b', 'read')] }
  ])('is idempotent for %j', ({ members, level, start }) => {
    const first = reconcileGrant(members.map(acc), level, start)
    const applied = applyPlan(start, members, level, first)
    const second = reconcileGrant(members.map(acc), level, applied)
    expect(second.toCreate).toEqual([])
    expect(second.toRemove).toEqual([])
  })
})
