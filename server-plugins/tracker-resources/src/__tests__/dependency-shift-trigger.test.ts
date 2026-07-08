//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

//  — Notification on Dependency-Shift (server-side dispatch) — H2.
//
// Verifies the anti-spoofing contract of `OnDependencyShiftRequest`: the
// notification author (`triggerUserId`) is derived from the request Tx author
// (`tx.modifiedBy` → account) and NEVER from client-supplied payload, and the
// request-issuing user is self-suppressed from the fan-out.

import core, { type AccountUuid, type Ref } from '@hcengineering/core'
import contact from '@hcengineering/contact'
import notification from '@hcengineering/notification'

// server-contact is mocked so the trigger's modifiedBy→account resolution is
// deterministic without a live account store.
const getAccountBySocialId = jest.fn()
jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialId: (...a: unknown[]) => getAccountBySocialId(...a)
}))

// Augment @hcengineering/tracker with the H2 symbols the compiled fixture may
// not yet expose in a partial build; the grouping impl is exercised in full by
// plugins/tracker group-shifts.test.ts.
jest.mock('@hcengineering/tracker', () => {
  const actual = jest.requireActual('@hcengineering/tracker')
  function groupShiftsByRecipient (
    triggerUserId: AccountUuid | undefined,
    entries: any[],
    collaboratorsByIssue: Map<any, AccountUuid[]>
  ): Map<AccountUuid, any[]> {
    const result = new Map<AccountUuid, any[]>()
    for (const entry of entries) {
      const collaborators = collaboratorsByIssue.get(entry.issueId) ?? []
      const seen = new Set<AccountUuid>()
      for (const acc of collaborators) {
        if (triggerUserId !== undefined && acc === triggerUserId) continue
        if (seen.has(acc)) continue
        seen.add(acc)
        const bucket = result.get(acc)
        if (bucket === undefined) result.set(acc, [entry])
        else bucket.push(entry)
      }
    }
    return result
  }
  return {
    __esModule: true,
    ...actual,
    groupShiftsByRecipient,
    default: {
      ...actual.default,
      class: {
        ...actual.default.class,
        DependencyShiftRequest: 'tracker:class:DependencyShiftRequest'
      }
    }
  }
})

// Imported after the mocks are registered.
// eslint-disable-next-line import/first
import { OnDependencyShiftRequest } from '../index'
// eslint-disable-next-line import/first
import tracker from '@hcengineering/tracker'

const REAL = 'acc-real' as AccountUuid
const MEMBER = 'acc-member' as AccountUuid

function payload (issueId: string): any {
  return { issueId, identifier: issueId, title: issueId, deltaMs: 0, oldStart: 0, newStart: 0, oldDue: 0, newDue: 0 }
}

function makeControl (): any {
  const findAll = jest.fn(async (_ctx: unknown, _class: Ref<any>, _q: any) => {
    if (_class === core.class.Collaborator) {
      return [
        { attachedTo: 'issueB', collaborator: REAL },
        { attachedTo: 'issueB', collaborator: MEMBER }
      ]
    }
    if (_class === contact.mixin.Employee) {
      return [{ _id: 'emp-member', personUuid: MEMBER }]
    }
    if (_class === contact.class.PersonSpace) {
      return [{ _id: 'ps-member', person: 'emp-member' }]
    }
    if (_class === notification.class.DocNotifyContext) {
      return []
    }
    return []
  })
  const txFactory = {
    createTxRemoveDoc: (_class: any, space: any, objectId: any) => ({
      _class: core.class.TxRemoveDoc,
      objectClass: _class,
      objectSpace: space,
      objectId
    }),
    createTxUpdateDoc: (_class: any, space: any, objectId: any, operations: any) => ({
      _class: core.class.TxUpdateDoc,
      objectClass: _class,
      objectSpace: space,
      objectId,
      operations
    }),
    createTxCreateDoc: (_class: any, space: any, attributes: any, objectId?: any) => ({
      _class: core.class.TxCreateDoc,
      objectClass: _class,
      objectSpace: space,
      attributes,
      objectId
    })
  }
  return { ctx: { contextData: {} }, findAll, txFactory }
}

function makeReqTx (modifiedBy: string): any {
  return {
    _class: core.class.TxCreateDoc,
    space: core.space.Tx,
    objectId: 'req1',
    objectClass: tracker.class.DependencyShiftRequest,
    objectSpace: 'project1',
    modifiedBy,
    modifiedOn: Date.now(),
    attributes: {
      triggerIssueId: 'issueA',
      triggerIssueIdentifier: 'PROJ-1',
      triggerIssueTitle: 'Trigger issue',
      triggerIssueSpace: 'project1',
      // No triggerUserId in the schema — even if a client tried to inject one,
      // it is not read; the trigger derives the author from modifiedBy.
      shiftedIssues: [payload('issueB')],
      cascadeToken: 'tok-1'
    }
  }
}

function isShiftedNotificationCreate (tx: any): boolean {
  return tx?._class === core.class.TxCreateDoc && tx?.objectClass === tracker.class.DependencyShiftedNotification
}

describe('OnDependencyShiftRequest (H2)', () => {
  beforeEach(() => {
    getAccountBySocialId.mockReset()
  })

  it('derives triggerUserId from tx.modifiedBy and self-suppresses the author', async () => {
    getAccountBySocialId.mockResolvedValue(REAL) // modifiedBy 'social-real' → REAL account
    const control = makeControl()
    const res = await OnDependencyShiftRequest([makeReqTx('social-real')], control)

    const notif = res.find(isShiftedNotificationCreate)
    expect(notif).toBeDefined()
    // Author comes from the resolved account, never from payload.
    expect(notif.attributes.triggerUserId).toBe(REAL)
    // Recipient is the member, not the self-suppressed author.
    expect(notif.attributes.user).toBe(MEMBER)
    // No self-notification back to the trigger user.
    const selfNotif = res.filter(isShiftedNotificationCreate).some((t: any) => t.attributes.user === REAL)
    expect(selfNotif).toBe(false)
    // The request doc is always cleaned up.
    expect(res.some((t: any) => t._class === core.class.TxRemoveDoc && t.objectId === 'req1')).toBe(true)
  })

  it('fails closed (no notifications) when the author account cannot be resolved', async () => {
    getAccountBySocialId.mockResolvedValue(null)
    const control = makeControl()
    const res = await OnDependencyShiftRequest([makeReqTx('unknown-social')], control)

    expect(res.some(isShiftedNotificationCreate)).toBe(false)
    // Still cleans up the request doc.
    expect(res.some((t: any) => t._class === core.class.TxRemoveDoc && t.objectId === 'req1')).toBe(true)
  })
})
