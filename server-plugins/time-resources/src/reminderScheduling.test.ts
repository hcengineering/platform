//
// Copyright © 2026 Hardcore Engineering Inc.
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

/* eslint-disable @typescript-eslint/consistent-type-assertions */

import core, { generateId, type TxRemoveDoc, type TxUpdateDoc } from '@hcengineering/core'
import type { PlatformQueueProducer } from '@hcengineering/server-core'
import time, { type ToDo, type WorkSlot } from '@hcengineering/time'
import { OnToDoUpdate, OnWorkSlotRemove, OnWorkSlotUpdate } from './index'

type AnyProducer = PlatformQueueProducer<any>

function makeQueueMock (): { queue: { getProducer: jest.Mock }, send: jest.Mock } {
  const send = jest.fn(async () => {})
  const producer: AnyProducer = { send, close: async () => {}, getQueue: () => queue as any } as any
  const queue = {
    getProducer: jest.fn(() => producer)
  }
  return { queue, send }
}

function makeControlBase (overrides: Partial<any> = {}): { control: any, send: jest.Mock } {
  const { queue, send } = makeQueueMock()

  const control: any = {
    ctx: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      contextData: { account: { uuid: generateId(), primarySocialId: core.account.System } }
    },
    workspace: { uuid: generateId(), url: 'ws', dataId: 'ws' },
    hierarchy: {
      isDerived: jest.fn(() => true),
      classHierarchyMixin: jest.fn(() => undefined)
    },
    modelDb: { findAll: jest.fn(), findAllSync: jest.fn(), getObject: jest.fn() },
    removedMap: new Map(),
    userStatusMap: new Map(),
    queue,
    cache: new Map(),
    contextCache: new Map(),
    storageAdapter: {} as any,
    serviceAdaptersManager: {} as any,
    lowLevel: {} as any,
    txFactory: { createTxUpdateDoc: jest.fn(), createTxRemoveDoc: jest.fn(), createTxCollectionCUD: jest.fn() } as any,
    apply: jest.fn(async () => ({})),
    domainRequest: jest.fn(async () => ({})),
    queryFind: jest.fn(async () => []),
    txes: [],
    findAll: jest.fn(async () => [])
  }

  Object.assign(control, overrides)

  return { control, send }
}

describe('todo reminder scheduling (TimeMachine)', () => {
  it('OnWorkSlotUpdate: schedules reminders when reminders change', async () => {
    const workSlotId = generateId()
    const todoId = generateId()

    const { control, send } = makeControlBase()

    // WorkSlot lookup inside scheduler.
    ;(control.findAll as jest.Mock).mockImplementation(async (_ctx: any, _class: any, query: any) => {
      if (_class === time.class.WorkSlot && query?._id === workSlotId) {
        return [
          {
            _id: workSlotId,
            _class: time.class.WorkSlot,
            space: core.space.Workspace,
            attachedTo: todoId,
            attachedToClass: time.class.ToDo,
            date: Date.now() + 60_000,
            reminders: [-5 * 60_000],
            dueDate: Date.now() + 120_000
          }
        ]
      }
      if (_class === time.class.ToDo && query?._id === todoId) {
        return [
          {
            _id: todoId,
            _class: time.class.ToDo,
            space: time.space.ToDos,
            attachedTo: core.space.Workspace as any,
            attachedToClass: core.class.Doc as any,
            workslots: 1,
            title: 't',
            description: '',
            priority: 0,
            visibility: 'private',
            doneOn: null,
            user: generateId() as any,
            rank: ''
          }
        ]
      }
      return []
    })

    const tx = {
      _id: generateId(),
      _class: core.class.TxUpdateDoc,
      objectId: workSlotId,
      objectClass: time.class.WorkSlot,
      objectSpace: core.space.Workspace,
      space: core.space.Tx,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      operations: { reminders: [-5 * 60_000] }
    } as unknown as TxUpdateDoc<WorkSlot>

    await OnWorkSlotUpdate([tx], control)

    // First call cancels `todoReminder_<workSlotId>_%`, second schedules the specific reminder.
    expect(send).toHaveBeenCalled()
    // Producer send signature: (ctx, workspace, msgs)
    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    expect(msgs.find((m: any) => m.type === 'cancel')).toBeDefined()
    expect(msgs.find((m: any) => m.type === 'schedule' && m.topic === 'scheduledNotification')).toBeDefined()
  })

  it('OnWorkSlotRemove: cancels reminders', async () => {
    const workSlotId = generateId()
    const { control, send } = makeControlBase()

    const tx = {
      _id: generateId(),
      _class: core.class.TxRemoveDoc,
      objectId: workSlotId,
      objectClass: time.class.WorkSlot,
      objectSpace: core.space.Workspace,
      space: core.space.Tx,
      modifiedBy: core.account.System,
      modifiedOn: Date.now()
    } as unknown as TxRemoveDoc<WorkSlot>

    await OnWorkSlotRemove([tx], control)

    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    expect(msgs.find((m: any) => m.type === 'cancel')).toBeDefined()
  })

  it('OnToDoUpdate(doneOn): cancels reminders for all workslots', async () => {
    const todoId = generateId()
    const ws1 = generateId()
    const ws2 = generateId()

    const { control, send } = makeControlBase()

    ;(control.findAll as jest.Mock).mockImplementation(async (_ctx: any, _class: any, query: any) => {
      if (_class === time.class.ToDo && query?._id === todoId) {
        return [
          {
            _id: todoId,
            _class: time.class.ToDo,
            space: time.space.ToDos,
            attachedTo: core.space.Workspace as any,
            attachedToClass: core.class.Doc as any,
            workslots: 2,
            title: 't',
            description: '',
            priority: 0,
            visibility: 'private',
            doneOn: Date.now(),
            user: generateId() as any,
            rank: ''
          }
        ]
      }
      if (_class === core.class.TxUpdateDoc && query?.objectId === todoId) {
        return []
      }
      if (_class === time.class.WorkSlot && query?.attachedTo === todoId) {
        return [
          {
            _id: ws1,
            _class: time.class.WorkSlot,
            space: core.space.Workspace,
            attachedTo: todoId,
            attachedToClass: time.class.ToDo,
            date: Date.now() + 60_000,
            dueDate: Date.now() + 120_000,
            reminders: [-5 * 60_000]
          },
          {
            _id: ws2,
            _class: time.class.WorkSlot,
            space: core.space.Workspace,
            attachedTo: todoId,
            attachedToClass: time.class.ToDo,
            date: Date.now() + 60_000,
            dueDate: Date.now() + 120_000,
            reminders: [-5 * 60_000]
          }
        ]
      }
      return []
    })

    const tx = {
      _id: generateId(),
      _class: core.class.TxUpdateDoc,
      objectId: todoId,
      objectClass: time.class.ToDo,
      objectSpace: time.space.ToDos,
      space: core.space.Tx,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      operations: { doneOn: Date.now() }
    } as unknown as TxUpdateDoc<ToDo>

    await OnToDoUpdate([tx], control)

    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    const cancelMsgs = msgs.filter((m: any) => m.type === 'cancel')
    expect(cancelMsgs.length).toBeGreaterThanOrEqual(2)
  })
})
