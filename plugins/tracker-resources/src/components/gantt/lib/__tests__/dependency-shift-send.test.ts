//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Ref, TxOperations } from '@hcengineering/core'
import tracker, { type Issue } from '@hcengineering/tracker'
import { sendDependencyShiftedNotifications, type DependencyShiftSendArgs } from '../dependency-shift-send'
import type { CascadeShift, PrimaryEdit } from '../types'

// NOTE: the client no longer resolves collaborators / recipient
// PersonSpaces and no longer writes notifications directly. It now emits a
// single `DependencyShiftRequest` doc into the trigger-issue's project space;
// the server trigger `OnDependencyShiftRequest` does the privileged recipient
// resolution + notification writes. Recipient-resolution behaviour is therefore
// covered by `server-plugins/tracker-resources` `dependency-shift-trigger.test.ts`,
// not here. These tests assert only the client contract: build payloads → one
// createDoc → return 1, and fail-soft error handling.

function issue (id: string, identifier: string, title: string, start: number | null, due: number | null): Issue {
  return {
    _id: id as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'space:default' as any,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any,
    identifier,
    title,
    startDate: start,
    dueDate: due,
    parents: [],
    assignee: null
  } as unknown as Issue
}

const TRIGGER_ISSUE = issue('A', 'PROJ-1', 'Alpha', Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 5))
const SHIFT_ISSUE = issue('B', 'PROJ-2', 'Beta', Date.UTC(2026, 4, 6), Date.UTC(2026, 4, 10))

const SHIFT: CascadeShift = {
  issue: SHIFT_ISSUE,
  oldStart: 0,
  oldDue: 1,
  newStart: 2,
  newDue: 3,
  reason: 'push-successor',
  triggeredBy: TRIGGER_ISSUE._id
}

function makeClient (
  createImpl?: () => Promise<unknown>,
  hasClass: boolean = true
): { client: TxOperations, createDoc: jest.Mock, hasClassMock: jest.Mock } {
  const createDoc = jest.fn(createImpl ?? (async () => 'newId' as any))
  // The emitter guards on the workspace model knowing the request class, so
  // the fake client has to expose a hierarchy just like the real one.
  const hasClassMock = jest.fn(() => hasClass)
  return {
    client: { createDoc, getHierarchy: () => ({ hasClass: hasClassMock }) } as unknown as TxOperations,
    createDoc,
    hasClassMock
  }
}

function args (primaries: PrimaryEdit[] = [], shifts: CascadeShift[] = []): DependencyShiftSendArgs {
  return {
    triggerIssue: TRIGGER_ISSUE,
    triggerUser: 'acc-trigger' as any,
    primaries,
    shifts,
    cascadeToken: 'gantt-cascade:42-1'
  }
}

describe('sendDependencyShiftedNotifications — client emits request doc', () => {
  it('returns 0 and creates nothing when no primaries and no shifts are supplied', async () => {
    const { client, createDoc } = makeClient()
    const created = await sendDependencyShiftedNotifications(client, args([], []))
    expect(created).toBe(0)
    expect(createDoc).not.toHaveBeenCalled()
  })

  it('writes one DependencyShiftRequest into the trigger-issue space and returns 1', async () => {
    const { client, createDoc } = makeClient()
    const created = await sendDependencyShiftedNotifications(client, args([], [SHIFT]))
    expect(created).toBe(1)
    expect(createDoc).toHaveBeenCalledTimes(1)
    const [clazz, space, payload] = (createDoc.mock.calls[0] ?? []) as [unknown, unknown, any]
    expect(clazz).toBe(tracker.class.DependencyShiftRequest)
    // Written into the *trigger issue's own* space — never a foreign PersonSpace.
    expect(space).toBe(TRIGGER_ISSUE.space)
    expect(payload.triggerIssueId).toBe(TRIGGER_ISSUE._id)
    expect(payload.cascadeToken).toBe('gantt-cascade:42-1')
    expect(Array.isArray(payload.shiftedIssues)).toBe(true)
    expect(payload.shiftedIssues.length).toBe(1)
  })
})

describe('sendDependencyShiftedNotifications — un-migrated workspace', () => {
  it('returns 0 and creates nothing when the model does not know DependencyShiftRequest', async () => {
    const { client, createDoc, hasClassMock } = makeClient(undefined, false)
    const created = await sendDependencyShiftedNotifications(client, args([], [SHIFT]))
    expect(created).toBe(0)
    expect(hasClassMock).toHaveBeenCalledWith(tracker.class.DependencyShiftRequest)
    // The date shift itself already committed — the notification must degrade
    // silently instead of throwing an error at the user.
    expect(createDoc).not.toHaveBeenCalled()
  })

  it('does not report the missing class through onError', async () => {
    const { client } = makeClient(undefined, false)
    const errors: unknown[] = []
    await sendDependencyShiftedNotifications(client, args([], [SHIFT]), (e) => errors.push(e))
    expect(errors).toEqual([])
  })
})

describe('sendDependencyShiftedNotifications — error handling', () => {
  it('returns 0 and forwards thrown createDoc errors to onError without throwing', async () => {
    const boom = new Error('db down')
    const { client } = makeClient(async () => {
      throw boom
    })
    const errors: unknown[] = []
    const created = await sendDependencyShiftedNotifications(client, args([], [SHIFT]), (e) => errors.push(e))
    expect(created).toBe(0)
    expect(errors).toEqual([boom])
  })

  it('swallows createDoc errors silently when no onError hook is provided', async () => {
    const { client } = makeClient(async () => {
      throw new Error('db down')
    })
    await expect(sendDependencyShiftedNotifications(client, args([], [SHIFT]))).resolves.toBe(0)
  })
})
