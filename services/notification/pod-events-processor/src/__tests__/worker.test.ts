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
import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import modelTime from '@hcengineering/model-time'
import notification from '@hcengineering/notification'
import type { ConsumerControl } from '@hcengineering/server-core'
import time from '@hcengineering/time'
import { getClient } from '../client'
import type { ScheduledNotificationMessage } from '../types'
import { handleScheduledNotification } from '../worker'

jest.mock('../client', () => ({
  getClient: jest.fn()
}))

describe('handleScheduledNotification', () => {
  const workspaceUuid = 'workspace-1' as WorkspaceUuid
  const baseMessage: ScheduledNotificationMessage = {
    kind: 'todoReminder',
    id: 'timer-1',
    workSlotId: 'workslot-1' as any,
    todoId: 'todo-1' as any,
    shiftMs: 1000,
    targetDate: 1_000_000
  }

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
  const client = {
    findOne,
    createDoc
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getClient as jest.Mock).mockResolvedValue({ client })
  })

  it('returns early for non-todo messages', async () => {
    await handleScheduledNotification(ctx, workspaceUuid, { ...baseMessage, kind: 'other' as any }, control)

    expect(getClient).not.toHaveBeenCalled()
    expect(control.heartbeat).not.toHaveBeenCalled()
  })

  it('skips creation when reminder was already created', async () => {
    findOne.mockImplementation(async (klass: any, query: any) => {
      if (klass === time.class.WorkSlot) return { _id: baseMessage.workSlotId }
      if (klass === time.class.ToDo) {
        return {
          _id: baseMessage.todoId,
          _class: 'time:class:ToDo',
          space: 'space-1',
          user: 'employee-1',
          title: 'Todo title'
        }
      }
      if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
      if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
      if (klass === notification.class.DocNotifyContext) return { _id: 'doc-notify-1' }
      if (klass === notification.class.CommonInboxNotification && query?.['intlParams.timerId'] === baseMessage.id) { return { _id: 'existing-notification' } }
      return undefined
    })

    await handleScheduledNotification(ctx, workspaceUuid, baseMessage, control)

    expect(createDoc).not.toHaveBeenCalled()
    expect(ctx.info).not.toHaveBeenCalled()
  })

  it('creates notify context and inbox notification when needed', async () => {
    let docNotifyContextCreated = false
    findOne.mockImplementation(async (klass: any, query: any) => {
      if (klass === time.class.WorkSlot) return { _id: baseMessage.workSlotId }
      if (klass === time.class.ToDo) {
        return {
          _id: baseMessage.todoId,
          _class: 'time:class:ToDo',
          space: 'space-1',
          user: 'employee-1',
          title: 'Todo title'
        }
      }
      if (klass === contact.mixin.Employee) return { personUuid: 'person-1' }
      if (klass === contact.class.PersonSpace) return { _id: 'person-space-1' }
      if (klass === notification.class.DocNotifyContext && query?._id === 'doc-notify-created-id') { return { _id: 'doc-notify-created-id' } }
      if (klass === notification.class.DocNotifyContext) { return docNotifyContextCreated ? { _id: 'doc-notify-created-id' } : undefined }
      return undefined
    })
    createDoc.mockImplementation(async (klass: any) => {
      if (klass === notification.class.DocNotifyContext) {
        docNotifyContextCreated = true
        return 'doc-notify-created-id'
      }
      return 'notification-created-id'
    })

    await handleScheduledNotification(ctx, workspaceUuid, baseMessage, control)

    expect(createDoc).toHaveBeenNthCalledWith(
      1,
      notification.class.DocNotifyContext,
      'person-space-1',
      expect.objectContaining({
        objectId: baseMessage.todoId,
        objectClass: 'time:class:ToDo',
        objectSpace: 'space-1',
        user: 'person-1',
        isPinned: false,
        hidden: false
      })
    )
    expect(createDoc).toHaveBeenNthCalledWith(
      2,
      notification.class.CommonInboxNotification,
      'person-space-1',
      expect.objectContaining({
        user: 'person-1',
        objectId: baseMessage.todoId,
        objectClass: 'time:class:ToDo',
        icon: time.icon.Planned,
        header: time.string.ToDo,
        message: time.string.ToDo,
        intlParams: { timerId: baseMessage.id },
        types: [modelTime.ids.ToDoReminder],
        isViewed: false,
        archived: false,
        docNotifyContext: 'doc-notify-created-id'
      })
    )
    expect(ctx.info).toHaveBeenCalledWith(
      'Scheduled notification created',
      expect.objectContaining({
        kind: 'todoReminder',
        id: baseMessage.id,
        workSlotId: baseMessage.workSlotId,
        todoId: baseMessage.todoId,
        user: 'person-1',
        spaceId: 'person-space-1'
      })
    )
  })
})
