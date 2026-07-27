//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Notification on Dependency-Shift (server-side dispatch).
//
// Verifies the anti-spoofing contract of `OnDependencyShiftRequest`. The
// request doc is written by a client, so nothing in it may be trusted:
//
//  - the notification author (`triggerUserId`) is derived from the request Tx
//    author (`tx.modifiedBy` → account) and NEVER from the payload, and the
//    request-issuing user is self-suppressed from the fan-out,
//  - the trigger issue and every shifted issue are re-read from storage,
//    restricted to the request's own space, so a payload cannot reach members
//    of foreign projects or invent issues,
//  - identifier and title shown in the notification come from the stored docs,
//    not from the payload, and no date/delta is emitted at all (a client-
//    reported shift is unverifiable once the cascade has committed),
//  - duplicates collapse, oversized payloads are capped, and an empty result
//    after filtering dispatches nothing at all.

import core, { type AccountUuid, type Ref } from '@hcengineering/core'
import contact from '@hcengineering/contact'
import notification from '@hcengineering/notification'

// server-contact is mocked so the trigger's modifiedBy→account resolution is
// deterministic without a live account store.
const getAccountBySocialId = jest.fn()
jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialId: (...a: unknown[]) => getAccountBySocialId(...a)
}))

// Augment @hcengineering/tracker with the dependency-shift symbols the compiled fixture may
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
const OUTSIDER = 'acc-outsider' as AccountUuid

const HOME = 'project1'
const FOREIGN = 'project2'

const DAY = 86_400_000
const DAY0 = 1_700_000_000_000

/** Must mirror `MAX_SHIFTED_ISSUES` in ../index. */
const MAX_SHIFTED_ISSUES = 200

interface FakeIssue {
  _id: string
  space: string
  identifier: string
  title: string
  startDate: number | null
  dueDate: number | null
  assignee: string | null
}

function issue (_id: string, space: string, identifier: string, title: string, shiftDays = 2): FakeIssue {
  return {
    _id,
    space,
    identifier,
    title,
    startDate: DAY0 + shiftDays * DAY,
    dueDate: DAY0 + (shiftDays + 5) * DAY,
    assignee: null
  }
}

/** The stored world every test resolves against. */
function defaultIssues (): FakeIssue[] {
  return [
    issue('issueA', HOME, 'PROJ-1', 'Trigger issue', 0),
    issue('issueB', HOME, 'PROJ-2', 'Real title of B'),
    issue('issueC', HOME, 'PROJ-3', 'Real title of C'),
    issue('issueForeign', FOREIGN, 'OTHER-9', 'Foreign issue')
  ]
}

/**
 * A shift payload entry as a *client* could send it: the ids and the metadata
 * are freely chosen, which is exactly what the trigger must not trust.
 */
function payload (issueId: string, over: Partial<Record<string, unknown>> = {}): any {
  return {
    issueId,
    identifier: `FAKE-${issueId}`,
    title: `forged title for ${issueId}`,
    deltaMs: 999 * DAY,
    oldStart: DAY0,
    newStart: DAY0,
    oldDue: DAY0,
    newDue: DAY0,
    ...over
  }
}

interface WorldOptions {
  issues?: FakeIssue[]
  /** issueId → collaborator accounts */
  collaborators?: Record<string, AccountUuid[]>
}

function matches (value: unknown, criteria: any): boolean {
  if (criteria !== null && typeof criteria === 'object') {
    if (Array.isArray(criteria.$in)) return criteria.$in.includes(value)
    return false
  }
  return value === criteria
}

function makeControl (opts: WorldOptions = {}): any {
  const issues = opts.issues ?? defaultIssues()
  const collaborators = opts.collaborators ?? { issueB: [REAL, MEMBER] }

  const findAll = jest.fn(async (_ctx: unknown, _class: Ref<any>, q: any, _o?: any) => {
    if (_class === tracker.class.Issue) {
      return issues.filter(
        (i) => (q._id === undefined || matches(i._id, q._id)) && (q.space === undefined || matches(i.space, q.space))
      )
    }
    if (_class === core.class.Collaborator) {
      const out: any[] = []
      for (const [attachedTo, accs] of Object.entries(collaborators)) {
        if (q.attachedTo !== undefined && !matches(attachedTo, q.attachedTo)) continue
        for (const collaborator of accs) out.push({ attachedTo, collaborator })
      }
      return out
    }
    if (_class === contact.mixin.Employee) {
      // Two call sites: assignee fallback (`_id` query) and recipient-space
      // resolution (`personUuid` query).
      if (q.personUuid !== undefined) {
        return [MEMBER, OUTSIDER]
          .filter((acc) => matches(acc, q.personUuid))
          .map((acc) => ({ _id: `emp-${acc}`, personUuid: acc }))
      }
      return []
    }
    if (_class === contact.class.PersonSpace) {
      return [MEMBER, OUTSIDER]
        .map((acc) => ({ _id: `ps-${acc}`, person: `emp-${acc}` }))
        .filter((s) => q.person === undefined || matches(s.person, q.person))
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

function makeReqTx (modifiedBy: string, over: Partial<Record<string, unknown>> = {}): any {
  return {
    _class: core.class.TxCreateDoc,
    space: core.space.Tx,
    objectId: 'req1',
    objectClass: tracker.class.DependencyShiftRequest,
    objectSpace: HOME,
    modifiedBy,
    modifiedOn: Date.now(),
    attributes: {
      triggerIssueId: 'issueA',
      triggerIssueIdentifier: 'FORGED-1',
      triggerIssueTitle: 'forged trigger title',
      triggerIssueSpace: HOME,
      // No triggerUserId in the schema — even if a client tried to inject one,
      // it is not read; the trigger derives the author from modifiedBy.
      shiftedIssues: [payload('issueB')],
      cascadeToken: 'tok-1',
      ...over
    }
  }
}

function isShiftedNotificationCreate (tx: any): boolean {
  return tx?._class === core.class.TxCreateDoc && tx?.objectClass === tracker.class.DependencyShiftedNotification
}

function isContextCreate (tx: any): boolean {
  return tx?._class === core.class.TxCreateDoc && tx?.objectClass === notification.class.DocNotifyContext
}

function requestRemoved (res: any[]): boolean {
  return res.some((t: any) => t._class === core.class.TxRemoveDoc && t.objectId === 'req1')
}

describe('OnDependencyShiftRequest', () => {
  beforeEach(() => {
    getAccountBySocialId.mockReset()
    getAccountBySocialId.mockResolvedValue(REAL)
  })

  it('derives triggerUserId from tx.modifiedBy and self-suppresses the author', async () => {
    getAccountBySocialId.mockResolvedValue(REAL) // modifiedBy 'social-real' → REAL account
    const control = makeControl()
    const res = await OnDependencyShiftRequest([makeReqTx('social-real')], control)

    const notif = res.find(isShiftedNotificationCreate) as any
    expect(notif).toBeDefined()
    // Author comes from the resolved account, never from payload.
    expect(notif.attributes.triggerUserId).toBe(REAL)
    // Recipient is the member, not the self-suppressed author.
    expect(notif.attributes.user).toBe(MEMBER)
    // No self-notification back to the trigger user.
    const selfNotif = res.filter(isShiftedNotificationCreate).some((t: any) => t.attributes.user === REAL)
    expect(selfNotif).toBe(false)
    // The request doc is always cleaned up.
    expect(requestRemoved(res)).toBe(true)
  })

  it('fails closed (no notifications) when the author account cannot be resolved', async () => {
    getAccountBySocialId.mockResolvedValue(null)
    const control = makeControl()
    const res = await OnDependencyShiftRequest([makeReqTx('unknown-social')], control)

    expect(res.some(isShiftedNotificationCreate)).toBe(false)
    // Still cleans up the request doc.
    expect(requestRemoved(res)).toBe(true)
  })

  it('drops shifted issues that live in another space', async () => {
    const control = makeControl({
      collaborators: { issueB: [MEMBER], issueForeign: [OUTSIDER] }
    })
    const res = await OnDependencyShiftRequest(
      [makeReqTx('social-real', { shiftedIssues: [payload('issueB'), payload('issueForeign')] })],
      control
    )

    const notifs = res.filter(isShiftedNotificationCreate) as any[]
    // The foreign project's member is never reached.
    expect(notifs.map((n) => n.attributes.user)).toEqual([MEMBER])
    expect(notifs[0].attributes.shiftedIssues.map((s: any) => s.issueId)).toEqual(['issueB'])
    // The Collaborator lookup never even sees the foreign id.
    const collabCall = control.findAll.mock.calls.find((c: any[]) => c[1] === core.class.Collaborator)
    expect(collabCall[2].attachedTo.$in).toEqual(['issueB'])
  })

  it('drops ids that do not resolve to an issue at all', async () => {
    const control = makeControl({ collaborators: { issueB: [MEMBER], 'workspace-secret': [OUTSIDER] } })
    const res = await OnDependencyShiftRequest(
      [
        makeReqTx('social-real', {
          shiftedIssues: [payload('issueB'), payload('workspace-secret'), payload('does-not-exist'), { noId: 1 }]
        })
      ],
      control
    )

    const notifs = res.filter(isShiftedNotificationCreate) as any[]
    expect(notifs.map((n) => n.attributes.user)).toEqual([MEMBER])
    expect(notifs[0].attributes.shiftedIssues.map((s: any) => s.issueId)).toEqual(['issueB'])
  })

  it('fails closed when the trigger issue is not an issue of the request space', async () => {
    const control = makeControl()
    const foreignTrigger = await OnDependencyShiftRequest(
      [makeReqTx('social-real', { triggerIssueId: 'issueForeign' })],
      control
    )
    expect(foreignTrigger.some(isShiftedNotificationCreate)).toBe(false)
    expect(requestRemoved(foreignTrigger)).toBe(true)

    const unknownTrigger = await OnDependencyShiftRequest(
      [makeReqTx('social-real', { triggerIssueId: 'no-such-issue' })],
      makeControl()
    )
    expect(unknownTrigger.some(isShiftedNotificationCreate)).toBe(false)
  })

  it('uses the stored trigger issue for identifier, title and notify-context space', async () => {
    const control = makeControl()
    const res = await OnDependencyShiftRequest(
      [
        makeReqTx('social-real', {
          triggerIssueIdentifier: 'FORGED-1',
          triggerIssueTitle: 'forged trigger title',
          triggerIssueSpace: FOREIGN
        })
      ],
      control
    )

    const notif = res.find(isShiftedNotificationCreate) as any
    expect(notif.attributes.triggerIssueIdentifier).toBe('PROJ-1')
    expect(notif.attributes.triggerIssueTitle).toBe('Trigger issue')
    expect(notif.attributes.intlParams.trigger).toBe('PROJ-1')

    const ctxTx = res.find(isContextCreate) as any
    // The forged `triggerIssueSpace` is ignored; the stored issue's space wins.
    expect(ctxTx.attributes.objectSpace).toBe(HOME)
  })

  it('rebuilds identifier and title from the stored issue, carrying no dates or delta', async () => {
    const control = makeControl()
    const res = await OnDependencyShiftRequest([makeReqTx('social-real')], control)

    const notif = res.find(isShiftedNotificationCreate) as any
    const entry = notif.attributes.shiftedIssues[0]
    // Identity is re-derived from storage (payload's forged FAKE-* / forged title
    // never reach the notification).
    expect(entry).toEqual({ issueId: 'issueB', identifier: 'PROJ-2', title: 'Real title of B' })
    // No date or delta field is emitted at all — a client-reported shift is
    // unverifiable once the cascade has committed, so it is never shown.
    for (const k of ['deltaMs', 'oldStart', 'newStart', 'oldDue', 'newDue']) {
      expect(k in entry).toBe(false)
    }
  })

  it('never turns a forged pre-shift date into a trusted delta', async () => {
    const control = makeControl()
    // A client forging a 999-day delta and arbitrary old/new dates …
    const res = await OnDependencyShiftRequest(
      [
        makeReqTx('social-real', {
          shiftedIssues: [payload('issueB', { deltaMs: 999 * DAY, oldStart: 0, oldDue: 0, newStart: 0, newDue: 0 })]
        })
      ],
      control
    )

    const entry = (res.find(isShiftedNotificationCreate) as any).attributes.shiftedIssues[0]
    // … gets none of it through: the notification states only which issue moved.
    expect(entry).toEqual({ issueId: 'issueB', identifier: 'PROJ-2', title: 'Real title of B' })
    expect('deltaMs' in entry).toBe(false)
  })

  it('deduplicates repeated ids', async () => {
    const control = makeControl({ collaborators: { issueB: [MEMBER] } })
    const res = await OnDependencyShiftRequest(
      [
        makeReqTx('social-real', {
          shiftedIssues: [payload('issueB'), payload('issueB'), payload('issueB')]
        })
      ],
      control
    )

    const notif = res.find(isShiftedNotificationCreate) as any
    expect(notif.attributes.shiftedIssues).toHaveLength(1)
    expect(notif.attributes.intlParams.count).toBe(1)
  })

  it('caps an oversized payload at MAX_SHIFTED_ISSUES', async () => {
    const many: FakeIssue[] = [issue('issueA', HOME, 'PROJ-1', 'Trigger issue', 0)]
    const collaborators: Record<string, AccountUuid[]> = {}
    for (let i = 0; i < MAX_SHIFTED_ISSUES + 50; i++) {
      many.push(issue(`bulk${i}`, HOME, `PROJ-${i + 10}`, `Bulk ${i}`))
      collaborators[`bulk${i}`] = [MEMBER]
    }
    const control = makeControl({ issues: many, collaborators })
    const res = await OnDependencyShiftRequest(
      [
        makeReqTx('social-real', {
          shiftedIssues: many.filter((i) => i._id !== 'issueA').map((i) => payload(i._id))
        })
      ],
      control
    )

    const notif = res.find(isShiftedNotificationCreate) as any
    expect(notif.attributes.shiftedIssues).toHaveLength(MAX_SHIFTED_ISSUES)
  })

  it('dispatches nothing when the payload is empty after filtering', async () => {
    const control = makeControl({ collaborators: { issueForeign: [OUTSIDER] } })
    const res = await OnDependencyShiftRequest(
      [makeReqTx('social-real', { shiftedIssues: [payload('issueForeign'), payload('nope')] })],
      control
    )

    expect(res.some(isShiftedNotificationCreate)).toBe(false)
    expect(res.some(isContextCreate)).toBe(false)
    expect(requestRemoved(res)).toBe(true)
  })

  it('truncates the cascade token and never branches on it', async () => {
    const control = makeControl()
    const res = await OnDependencyShiftRequest([makeReqTx('social-real', { cascadeToken: 'x'.repeat(5000) })], control)

    const notif = res.find(isShiftedNotificationCreate) as any
    expect(notif).toBeDefined()
    expect(notif.attributes.cascadeToken).toHaveLength(128)

    // A non-string token neither breaks nor blocks the dispatch.
    const res2 = await OnDependencyShiftRequest(
      [makeReqTx('social-real', { cascadeToken: { evil: true } })],
      makeControl()
    )
    const notif2 = res2.find(isShiftedNotificationCreate) as any
    expect(notif2.attributes.cascadeToken).toBe('')
  })
})
