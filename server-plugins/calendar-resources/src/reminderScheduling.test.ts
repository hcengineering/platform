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

import calendar, { type Event } from '@hcengineering/calendar'
import core, { generateId } from '@hcengineering/core'
import type { PlatformQueueProducer } from '@hcengineering/server-core'
import { cancelEventReminders, scheduleEventReminders } from './index'

type AnyProducer = PlatformQueueProducer<any>

function makeQueueMock (): { queue: { getProducer: jest.Mock }, send: jest.Mock } {
  const send = jest.fn(async () => {})
  const producer: AnyProducer = { send, close: async () => {}, getQueue: () => queue as any } as any
  const queue = {
    getProducer: jest.fn(() => producer)
  }
  return { queue, send }
}

function makeControl (overrides: Partial<any> = {}): { control: any, send: jest.Mock } {
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

describe('event reminder scheduling (TimeMachine)', () => {
  const eventClass = calendar.class.Event

  it('schedules reminders at `event.date - shiftMs` and uses the eventReminder_ timer prefix', async () => {
    const eventId = generateId() as any
    // 1 hour in the future, so a 5-minute "before" reminder is in the future too.
    const eventDate = Date.now() + 60 * 60_000
    const shiftMs = 5 * 60_000

    const { control, send } = makeControl()
    ;(control.findAll as jest.Mock).mockImplementation(async (_ctx: any, _class: any, query: any) => {
      if (_class === calendar.class.Event && query?._id === eventId) {
        return [
          {
            _id: eventId,
            _class: eventClass,
            space: core.space.Workspace,
            date: eventDate,
            dueDate: eventDate + 60_000,
            reminders: [shiftMs]
          } as Partial<Event>
        ]
      }
      return []
    })

    await scheduleEventReminders(control, eventId)

    // Producer.send signature: (ctx, workspace, msgs).
    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    const cancelMsg = msgs.find((m: any) => m.type === 'cancel')
    const scheduleMsg = msgs.find((m: any) => m.type === 'schedule' && m.topic === 'scheduledNotification')

    expect(cancelMsg).toBeDefined()
    expect(cancelMsg.id).toBe(`eventReminder_${eventId}_%`)

    expect(scheduleMsg).toBeDefined()
    expect(scheduleMsg.id).toBe(`eventReminder_${eventId}_${shiftMs}`)
    // Reminder must fire BEFORE the event, exactly `shiftMs` earlier.
    expect(scheduleMsg.targetDate).toBe(eventDate - shiftMs)
    expect(scheduleMsg.data.kind).toBe('eventReminder')
    expect(scheduleMsg.data.eventId).toBe(eventId)
    expect(scheduleMsg.data.eventClass).toBe(eventClass)
    expect(scheduleMsg.data.shiftMs).toBe(shiftMs)
    expect(scheduleMsg.data.targetDate).toBe(eventDate - shiftMs)
  })

  it('skips reminders that resolve to the past', async () => {
    const eventId = generateId() as any
    // Event 1 minute in the future, 5-min reminder lands 4 minutes in the past — must be skipped.
    const eventDate = Date.now() + 60_000
    const shiftMs = 5 * 60_000

    const { control, send } = makeControl()
    ;(control.findAll as jest.Mock).mockImplementation(async (_ctx: any, _class: any, query: any) => {
      if (_class === calendar.class.Event && query?._id === eventId) {
        return [
          {
            _id: eventId,
            _class: eventClass,
            space: core.space.Workspace,
            date: eventDate,
            dueDate: eventDate + 60_000,
            reminders: [shiftMs]
          } as Partial<Event>
        ]
      }
      return []
    })

    await scheduleEventReminders(control, eventId)

    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    expect(msgs.find((m: any) => m.type === 'schedule')).toBeUndefined()
    // Cancel for the prefix is still issued so any prior timers get cleared.
    expect(msgs.find((m: any) => m.type === 'cancel')).toBeDefined()
  })

  it('does not schedule when the event has no reminders configured', async () => {
    const eventId = generateId() as any

    const { control, send } = makeControl()
    ;(control.findAll as jest.Mock).mockImplementation(async (_ctx: any, _class: any, query: any) => {
      if (_class === calendar.class.Event && query?._id === eventId) {
        return [
          {
            _id: eventId,
            _class: eventClass,
            space: core.space.Workspace,
            date: Date.now() + 60 * 60_000,
            dueDate: Date.now() + 70 * 60_000,
            reminders: []
          } as Partial<Event>
        ]
      }
      return []
    })

    await scheduleEventReminders(control, eventId)

    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    // Cancel always issued (resets prior state); but no schedule msg.
    expect(msgs.find((m: any) => m.type === 'schedule')).toBeUndefined()
  })

  it('schedules ALL future reminders when more than one is configured', async () => {
    const eventId = generateId() as any
    const eventDate = Date.now() + 60 * 60_000
    const shifts = [5 * 60_000, 15 * 60_000, 30 * 60_000]

    const { control, send } = makeControl()
    ;(control.findAll as jest.Mock).mockImplementation(async (_ctx: any, _class: any, query: any) => {
      if (_class === calendar.class.Event && query?._id === eventId) {
        return [
          {
            _id: eventId,
            _class: eventClass,
            space: core.space.Workspace,
            date: eventDate,
            dueDate: eventDate + 60_000,
            reminders: shifts
          } as Partial<Event>
        ]
      }
      return []
    })

    await scheduleEventReminders(control, eventId)

    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    const scheduleMsgs = msgs.filter((m: any) => m.type === 'schedule')
    expect(scheduleMsgs).toHaveLength(shifts.length)
    for (const shiftMs of shifts) {
      const m = scheduleMsgs.find((s: any) => s.id === `eventReminder_${eventId}_${shiftMs}`)
      expect(m).toBeDefined()
      expect(m.targetDate).toBe(eventDate - shiftMs)
    }
  })

  it('cancelEventReminders sends a wildcard cancel for the prefix', async () => {
    const eventId = generateId() as any
    const { control, send } = makeControl()

    await cancelEventReminders(control, eventId)

    const msgs = send.mock.calls.map((c: any[]) => c[2]).flat()
    const cancelMsg = msgs.find((m: any) => m.type === 'cancel')
    expect(cancelMsg).toBeDefined()
    expect(cancelMsg.id).toBe(`eventReminder_${eventId}_%`)
  })

  it('does nothing when control.queue is undefined', async () => {
    const eventId = generateId() as any
    const { control, send } = makeControl({ queue: undefined })

    await scheduleEventReminders(control, eventId)
    await cancelEventReminders(control, eventId)

    expect(send).not.toHaveBeenCalled()
  })

  it('does nothing when the event is not found', async () => {
    const eventId = generateId() as any
    const { control, send } = makeControl()
    ;(control.findAll as jest.Mock).mockResolvedValue([])

    await scheduleEventReminders(control, eventId)

    // No event to schedule for — only the cancel-on-reset behavior is skipped too because we bail
    // before that. Verify nothing was sent.
    expect(send).not.toHaveBeenCalled()
  })
})
