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

import contact from '@hcengineering/contact'
import core, { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import modelTime from '@hcengineering/model-time'
import notification from '@hcengineering/notification'
import { PlatformError, Severity, Status } from '@hcengineering/platform'
import type { ConsumerControl } from '@hcengineering/server-core'
import time from '@hcengineering/time'
import { getClient } from '../client'
import type { ScheduledNotificationMessage } from '../types'
import { buildReminderNotificationId, handleScheduledNotification } from '../worker'

const eventClassRef = 'calendar:class:Event' as any

jest.mock('../client', () => ({
  getClient: jest.fn()
}))

describe('handleScheduledNotification', () => {
  const workspaceUuid = 'workspace-1' as WorkspaceUuid

  const control = {
    heartbeat: jest.fn(async () => {})
  } as unknown as ConsumerControl

  const ctx = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext

  const findOne = jest.fn()
  const createDoc = jest.fn()
  const findPersonBySocialId = jest.fn()
  const isDerived = jest.fn((child: any, parent: any) => {
    if (child === parent) return true
    if (parent === time.class.ToDo) {
      // ToDo and its known subclasses.
      return child === time.class.ToDo || child === 'time:class:ProjectToDo'
    }
    return false
  })
  const getHierarchy = jest.fn(() => ({ isDerived }))
  const client = { findOne, createDoc, getHierarchy }
  const accountClient = { findPersonBySocialId }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getClient as jest.Mock).mockResolvedValue({ client, accountClient })
  })

  // --------------------------------------------------------------------------------
  // Common helpers
  // --------------------------------------------------------------------------------
  const workSlotMessage: ScheduledNotificationMessage = {
    kind: 'eventReminder',
    id: 'timer-workslot-1',
    eventId: 'workslot-1' as any,
    eventClass: time.class.WorkSlot as any,
    shiftMs: 1000,
    targetDate: 1_000_000
  }
  const eventMessage: ScheduledNotificationMessage = {
    kind: 'eventReminder',
    id: 'timer-event-1',
    eventId: 'event-1' as any,
    eventClass: eventClassRef,
    shiftMs: 1000,
    targetDate: 1_000_000
  }

  // --------------------------------------------------------------------------------
  // Negative paths: things the worker should silently ignore.
  // --------------------------------------------------------------------------------
  it('returns early for non-eventReminder messages (e.g. legacy todoReminder messages)', async () => {
    const legacy = { ...workSlotMessage, kind: 'todoReminder' as any }
    await handleScheduledNotification(ctx, workspaceUuid, legacy as any, control)

    expect(getClient).not.toHaveBeenCalled()
    expect(control.heartbeat).not.toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------------
  // WorkSlot path: notification points at the parent ToDo (legacy UX preserved).
  // --------------------------------------------------------------------------------
  describe('WorkSlot/ToDo branch', () => {
    const expectedNotificationId = buildReminderNotificationId(workSlotMessage.id)

    it('skips when the ToDo is already done', async () => {
      findOne.mockImplementation(async (klass: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'todo-1',
            attachedToClass: time.class.ToDo
          }
        }
        if (klass === time.class.ToDo) {
          return {
            _id: 'todo-1',
            _class: 'time:class:ToDo',
            space: 'space-1',
            user: 'employee-1',
            title: 'Done todo',
            doneOn: Date.now()
          }
        }
        return undefined
      })

      await handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)

      expect(createDoc).not.toHaveBeenCalled()
      expect(ctx.info).not.toHaveBeenCalled()
    })

    it('creates DocNotifyContext + CommonInboxNotification pointing at the ToDo', async () => {
      let docNotifyContextCreated = false
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'todo-1',
            attachedToClass: time.class.ToDo
          }
        }
        if (klass === time.class.ToDo) {
          return {
            _id: 'todo-1',
            _class: 'time:class:ToDo',
            space: 'space-1',
            user: 'employee-1',
            title: 'Todo title',
            doneOn: null
          }
        }
        if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification && query?._id === expectedNotificationId) {
          return undefined
        }
        if (klass === notification.class.DocNotifyContext) {
          return docNotifyContextCreated ? { _id: 'doc-notify-created-id' } : undefined
        }
        return undefined
      })
      createDoc.mockImplementation(async (klass: any) => {
        if (klass === notification.class.DocNotifyContext) {
          docNotifyContextCreated = true
          return 'doc-notify-created-id'
        }
        return expectedNotificationId
      })

      await handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)

      // 1st createDoc: DocNotifyContext targeting the ToDo, with System modifiedBy.
      expect(createDoc).toHaveBeenNthCalledWith(
        1,
        notification.class.DocNotifyContext,
        'person-space-1',
        expect.objectContaining({
          objectId: 'todo-1',
          objectClass: 'time:class:ToDo',
          objectSpace: 'space-1',
          user: 'person-1'
        }),
        undefined,
        undefined,
        core.account.System
      )

      // 2nd createDoc: CommonInboxNotification pointing at the ToDo with deterministic _id.
      expect(createDoc).toHaveBeenNthCalledWith(
        2,
        notification.class.CommonInboxNotification,
        'person-space-1',
        expect.objectContaining({
          user: 'person-1',
          objectId: 'todo-1',
          objectClass: 'time:class:ToDo',
          headerIcon: time.icon.Planned,
          types: [modelTime.ids.ToDoReminder],
          docNotifyContext: 'doc-notify-created-id'
        }),
        expectedNotificationId,
        undefined,
        core.account.System
      )

      // accountClient is NOT consulted on the ToDo path — it's the plain-event path that uses it.
      expect(findPersonBySocialId).not.toHaveBeenCalled()
    })

    // Regression: tracker-issue WorkSlots have `attachedToClass = 'time:class:ProjectToDo'` (a
    // ToDo subclass created by `IssueToDoFactory`). Strict equality `attachedToClass === ToDo`
    // would silently take the plain-event branch and route the notification at the WorkSlot
    // instead of the parent ProjectToDo.
    it('treats a ProjectToDo-backed WorkSlot as ToDo-backed (subclass via isDerived)', async () => {
      const projectTodoClass = 'time:class:ProjectToDo' as any
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'project-todo-1',
            attachedToClass: projectTodoClass
          }
        }
        if (klass === projectTodoClass) {
          return {
            _id: 'project-todo-1',
            _class: projectTodoClass,
            space: 'space-1',
            user: 'employee-1',
            title: 'Issue ToDo',
            doneOn: null
          }
        }
        if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification) return undefined
        if (klass === notification.class.DocNotifyContext) return undefined
        return undefined
      })
      createDoc
        .mockResolvedValueOnce('doc-notify-created-id')
        .mockResolvedValueOnce(buildReminderNotificationId(workSlotMessage.id))

      await handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)

      // hierarchy.isDerived must have been consulted to recognize ProjectToDo as a ToDo.
      expect(isDerived).toHaveBeenCalledWith(projectTodoClass, time.class.ToDo)

      // The notification points at the ProjectToDo, not at the WorkSlot.
      expect(createDoc.mock.calls[1][0]).toBe(notification.class.CommonInboxNotification)
      expect(createDoc.mock.calls[1][2]).toEqual(
        expect.objectContaining({
          objectId: 'project-todo-1',
          objectClass: projectTodoClass
        })
      )
      // accountClient is NOT consulted — the ToDo-backed path doesn't need it.
      expect(findPersonBySocialId).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------------
  // Plain Event path: notification points at the Event itself.
  // --------------------------------------------------------------------------------
  describe('plain Event branch', () => {
    const expectedNotificationId = buildReminderNotificationId(eventMessage.id)

    it('creates DocNotifyContext + CommonInboxNotification pointing at the Event', async () => {
      findPersonBySocialId.mockResolvedValue('person-uuid-1')
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === eventClassRef) {
          return {
            _id: eventMessage.eventId,
            _class: eventClassRef,
            space: 'event-space-1',
            attachedTo: 'some-doc',
            attachedToClass: 'some:class:Doc',
            user: 'social:1',
            title: 'Sprint planning meeting',
            date: Date.now()
          }
        }
        if (klass === contact.class.Person && query?.personUuid === 'person-uuid-1') {
          return { _id: 'person-1-doc' }
        }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification && query?._id === expectedNotificationId) {
          return undefined
        }
        if (klass === notification.class.DocNotifyContext) return undefined
        return undefined
      })
      createDoc
        .mockResolvedValueOnce('doc-notify-created-id') // DocNotifyContext
        .mockResolvedValueOnce(expectedNotificationId) // CommonInboxNotification

      await handleScheduledNotification(ctx, workspaceUuid, eventMessage, control)

      expect(findPersonBySocialId).toHaveBeenCalledWith('social:1', true)

      // DocNotifyContext targets the Event itself.
      expect(createDoc).toHaveBeenNthCalledWith(
        1,
        notification.class.DocNotifyContext,
        'person-space-1',
        expect.objectContaining({
          objectId: eventMessage.eventId,
          objectClass: eventClassRef,
          objectSpace: 'event-space-1',
          user: 'person-uuid-1'
        }),
        undefined,
        undefined,
        core.account.System
      )

      // Notification targets the Event itself, with the event's title in messageHtml.
      expect(createDoc).toHaveBeenNthCalledWith(
        2,
        notification.class.CommonInboxNotification,
        'person-space-1',
        expect.objectContaining({
          user: 'person-uuid-1',
          objectId: eventMessage.eventId,
          objectClass: eventClassRef
        }),
        expectedNotificationId,
        undefined,
        core.account.System
      )

      // The notification's title text should be derived from `event.title`, not a ToDo.
      const notifData = createDoc.mock.calls[1][2]
      expect(typeof notifData.messageHtml).toBe('string')
      expect(notifData.messageHtml).toContain('Sprint planning meeting')
    })

    it('skips when the social id does not resolve to a global person', async () => {
      findPersonBySocialId.mockResolvedValue(undefined)
      findOne.mockImplementation(async (klass: any) => {
        if (klass === eventClassRef) {
          return {
            _id: eventMessage.eventId,
            _class: eventClassRef,
            space: 'event-space-1',
            attachedTo: 'some-doc',
            attachedToClass: 'some:class:Doc',
            user: 'social:1',
            title: 'Mystery'
          }
        }
        return undefined
      })

      await handleScheduledNotification(ctx, workspaceUuid, eventMessage, control)
      expect(createDoc).not.toHaveBeenCalled()
    })

    it('skips when the event has no `user` (social id) — silently, no error', async () => {
      findOne.mockImplementation(async (klass: any) => {
        if (klass === eventClassRef) {
          return {
            _id: eventMessage.eventId,
            _class: eventClassRef,
            space: 'event-space-1',
            attachedTo: 'some-doc',
            attachedToClass: 'some:class:Doc',
            user: undefined,
            title: 'Untitled'
          }
        }
        return undefined
      })

      await handleScheduledNotification(ctx, workspaceUuid, eventMessage, control)

      expect(findPersonBySocialId).not.toHaveBeenCalled()
      expect(createDoc).not.toHaveBeenCalled()
      expect(ctx.error).not.toHaveBeenCalled()
    })

    it('skips when the receiver has no PersonSpace', async () => {
      findPersonBySocialId.mockResolvedValue('person-uuid-1')
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === eventClassRef) {
          return {
            _id: eventMessage.eventId,
            _class: eventClassRef,
            space: 'event-space-1',
            attachedTo: 'some-doc',
            attachedToClass: 'some:class:Doc',
            user: 'social:1',
            title: 't'
          }
        }
        if (klass === contact.class.Person && query?.personUuid === 'person-uuid-1') return { _id: 'person-1-doc' }
        return undefined
      })

      await handleScheduledNotification(ctx, workspaceUuid, eventMessage, control)
      expect(createDoc).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------------
  // Idempotency + error logging are independent of which branch we took.
  // --------------------------------------------------------------------------------
  describe('idempotency and error logging', () => {
    const expectedNotificationId = buildReminderNotificationId(workSlotMessage.id)

    it('skips creation when reminder was already created (idempotency by _id)', async () => {
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'todo-1',
            attachedToClass: time.class.ToDo
          }
        }
        if (klass === time.class.ToDo) {
          return {
            _id: 'todo-1',
            _class: 'time:class:ToDo',
            space: 'space-1',
            user: 'employee-1',
            title: 'Todo title'
          }
        }
        if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification && query?._id === expectedNotificationId) {
          return { _id: expectedNotificationId }
        }
        return undefined
      })

      await handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)

      expect(createDoc).not.toHaveBeenCalled()
      expect(ctx.info).not.toHaveBeenCalled()
    })

    it('reuses an existing DocNotifyContext without creating a new one', async () => {
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'todo-1',
            attachedToClass: time.class.ToDo
          }
        }
        if (klass === time.class.ToDo) {
          return { _id: 'todo-1', _class: 'time:class:ToDo', space: 'space-1', user: 'employee-1', title: 't' }
        }
        if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification && query?._id === expectedNotificationId) {
          return undefined
        }
        if (klass === notification.class.DocNotifyContext) return { _id: 'existing-doc-notify' }
        return undefined
      })
      createDoc.mockResolvedValue(expectedNotificationId)

      await handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)

      expect(createDoc).toHaveBeenCalledTimes(1)
      expect(createDoc).toHaveBeenCalledWith(
        notification.class.CommonInboxNotification,
        'person-space-1',
        expect.objectContaining({ docNotifyContext: 'existing-doc-notify' }),
        expectedNotificationId,
        undefined,
        core.account.System
      )
    })

    it('logs a detailed error and rethrows when CommonInboxNotification createDoc fails with Bad Request', async () => {
      findOne.mockImplementation(async (klass: any, query: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'todo-1',
            attachedToClass: time.class.ToDo
          }
        }
        if (klass === time.class.ToDo) {
          return { _id: 'todo-1', _class: 'time:class:ToDo', space: 'space-1', user: 'employee-1', title: 't' }
        }
        if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification && query?._id === expectedNotificationId) {
          return undefined
        }
        if (klass === notification.class.DocNotifyContext) return { _id: 'existing-doc-notify' }
        return undefined
      })
      const badRequest = new PlatformError(
        new Status(Severity.ERROR, 'platform:status:UnknownError' as any, { message: 'Bad Request' })
      )
      createDoc.mockRejectedValueOnce(badRequest)

      await expect(handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)).rejects.toBe(badRequest)

      expect(ctx.error).toHaveBeenCalledWith(
        'Failed to create CommonInboxNotification for event reminder',
        expect.objectContaining({
          err: badRequest,
          timerId: workSlotMessage.id,
          eventId: workSlotMessage.eventId,
          eventClass: workSlotMessage.eventClass,
          notificationId: expectedNotificationId,
          spaceId: 'person-space-1',
          user: 'person-1'
        })
      )
    })

    it('logs a detailed error and rethrows when DocNotifyContext createDoc fails', async () => {
      findOne.mockImplementation(async (klass: any) => {
        if (klass === time.class.WorkSlot) {
          return {
            _id: workSlotMessage.eventId,
            _class: time.class.WorkSlot,
            space: 'space-1',
            attachedTo: 'todo-1',
            attachedToClass: time.class.ToDo
          }
        }
        if (klass === time.class.ToDo) {
          return { _id: 'todo-1', _class: 'time:class:ToDo', space: 'space-1', user: 'employee-1', title: 't' }
        }
        if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
        if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
        if (klass === notification.class.CommonInboxNotification) return undefined
        if (klass === notification.class.DocNotifyContext) return undefined
        return undefined
      })
      const badRequest = new PlatformError(
        new Status(Severity.ERROR, 'platform:status:UnknownError' as any, { message: 'Bad Request' })
      )
      createDoc.mockRejectedValueOnce(badRequest)

      await expect(handleScheduledNotification(ctx, workspaceUuid, workSlotMessage, control)).rejects.toBe(badRequest)

      expect(ctx.error).toHaveBeenCalledWith(
        'Failed to create DocNotifyContext for event reminder',
        expect.objectContaining({
          err: badRequest,
          timerId: workSlotMessage.id,
          eventId: workSlotMessage.eventId,
          eventClass: workSlotMessage.eventClass,
          spaceId: 'person-space-1',
          user: 'person-1'
        })
      )
      expect(createDoc).toHaveBeenCalledTimes(1)
    })

    it('builds a stable, distinct notification _id per timer', () => {
      const a = buildReminderNotificationId('timer-A')
      const b = buildReminderNotificationId('timer-B')
      expect(a).not.toBe(b)
      expect(buildReminderNotificationId('timer-A')).toBe(a)
      expect(a.startsWith('eventReminderInbox:')).toBe(true)
    })
  })
})
