//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { AccountUuid, Ref, TxOperations } from '@hcengineering/core'
import type { Issue } from '@hcengineering/tracker'
import { sendDependencyShiftedNotifications, type DependencyShiftSendArgs } from '../dependency-shift-send'
import type { CascadeShift, PrimaryEdit } from '../types'

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
const TRIGGER_USER = 'acc-trigger' as AccountUuid

/**
 * Build a `TxOperations` stub good enough for the send pipeline. Each
 * find/create method records its calls and returns the value the test set
 * via `findAllResults[<className>]`. Unmatched classes fall back to an
 * empty array (so empty collaborator / empty PersonSpace branches trigger).
 */
interface ClientStub {
  client: TxOperations
  calls: Array<{ method: string, args: unknown[] }>
  findAllResults: Record<string, unknown[]>
  findOneResult: unknown
}

function makeClientStub (overrides?: Partial<Pick<ClientStub, 'findAllResults' | 'findOneResult'>>): ClientStub {
  const calls: Array<{ method: string, args: unknown[] }> = []
  const findAllResults: Record<string, unknown[]> = overrides?.findAllResults ?? {}
  const findOneResult: unknown = overrides?.findOneResult
  const client = {
    findAll: jest.fn(async (clazz: { toString: () => string } | string, ..._rest: unknown[]) => {
      const key = typeof clazz === 'string' ? clazz : String(clazz)
      calls.push({ method: 'findAll', args: [key] })
      return findAllResults[key] ?? []
    }),
    findOne: jest.fn(async (..._args: unknown[]) => {
      calls.push({ method: 'findOne', args: [..._args] })
      return findOneResult
    }),
    createDoc: jest.fn(async (..._args: unknown[]) => {
      calls.push({ method: 'createDoc', args: [..._args] })
      return 'newId' as any
    }),
    updateDoc: jest.fn(async (..._args: unknown[]) => {
      calls.push({ method: 'updateDoc', args: [..._args] })
      return 'ok' as any
    })
  } as unknown as TxOperations
  return { client, calls, findAllResults, findOneResult }
}

function args (
  primaries: PrimaryEdit[] = [],
  shifts: CascadeShift[] = []
): DependencyShiftSendArgs {
  return {
    triggerIssue: TRIGGER_ISSUE,
    triggerUser: TRIGGER_USER,
    primaries,
    shifts,
    cascadeToken: 'gantt-cascade:42-1'
  }
}

describe('sendDependencyShiftedNotifications — early returns', () => {
  it('returns 0 when no primaries and no shifts are supplied', async () => {
    const stub = makeClientStub()
    const created = await sendDependencyShiftedNotifications(stub.client, args([], []))
    expect(created).toBe(0)
    // No collaborator lookup should have happened.
    expect(stub.calls.find((c) => c.method === 'findAll')).toBeUndefined()
  })

  it('returns 0 when buildRecipientBundles finds no non-trigger recipients', async () => {
    // Trigger-user is the only collaborator on the shift -> bundle is empty.
    const stub = makeClientStub({
      findAllResults: {
        // Collaborator lookup: only the trigger user is attached.
        'tracker:class:Collaborator': [],
        // Force assignee fallback to map B to the trigger-user.
        'contact:mixin:Employee': []
      }
    })
    const created = await sendDependencyShiftedNotifications(
      stub.client,
      args([], [{ issue: SHIFT_ISSUE, oldStart: 0, oldDue: 1, newStart: 2, newDue: 3, reason: 'push-successor', triggeredBy: TRIGGER_ISSUE._id }])
    )
    expect(created).toBe(0)
    // createDoc must not have been called for a notification.
    expect((stub.client.createDoc as jest.Mock).mock.calls.length).toBe(0)
  })
})

describe('sendDependencyShiftedNotifications — error handling', () => {
  it('returns 0 and forwards thrown errors to onError without throwing', async () => {
    const boom = new Error('db down')
    const client = {
      findAll: jest.fn(async () => {
        throw boom
      })
    } as unknown as TxOperations
    const errors: unknown[] = []
    const created = await sendDependencyShiftedNotifications(
      client,
      args([], [{ issue: SHIFT_ISSUE, oldStart: 0, oldDue: 1, newStart: 2, newDue: 3, reason: 'push-successor', triggeredBy: TRIGGER_ISSUE._id }]),
      (e) => errors.push(e)
    )
    expect(created).toBe(0)
    expect(errors).toEqual([boom])
  })

  it('swallows errors silently when no onError hook is provided', async () => {
    const client = {
      findAll: jest.fn(async () => {
        throw new Error('db down')
      })
    } as unknown as TxOperations
    await expect(
      sendDependencyShiftedNotifications(
        client,
        args([], [{ issue: SHIFT_ISSUE, oldStart: 0, oldDue: 1, newStart: 2, newDue: 3, reason: 'push-successor', triggeredBy: TRIGGER_ISSUE._id }])
      )
    ).resolves.toBe(0)
  })
})

describe('sendDependencyShiftedNotifications — recipient resolution', () => {
  it('drops recipients whose PersonSpace cannot be resolved', async () => {
    // A non-trigger collaborator exists, but their Employee/PersonSpace lookup
    // returns nothing -> recipient is dropped, created should be 0.
    const otherUser = 'acc-other' as AccountUuid
    const collab = {
      _id: 'col-1',
      attachedTo: SHIFT_ISSUE._id,
      collaborator: otherUser
    }
    const stub = makeClientStub({
      findAllResults: {
        'tracker:class:Collaborator': [collab],
        // No matching Employee for that AccountUuid -> empty PersonSpace map.
        'contact:mixin:Employee': []
      }
    })
    const created = await sendDependencyShiftedNotifications(
      stub.client,
      args([], [{ issue: SHIFT_ISSUE, oldStart: 0, oldDue: 1, newStart: 2, newDue: 3, reason: 'push-successor', triggeredBy: TRIGGER_ISSUE._id }])
    )
    expect(created).toBe(0)
  })
})
