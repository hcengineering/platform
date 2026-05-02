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
import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import type { ConsumerControl } from '@hcengineering/server-core'
import notification from '@hcengineering/notification'
import modelTime from '@hcengineering/model-time'
import { jsonToMarkup, nodeDoc, nodeParagraph, nodeText } from '@hcengineering/text-core'
import time from '@hcengineering/time'
import { getClient } from './client'
import type { ScheduledNotificationMessage } from './types'

export async function handleScheduledNotification (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  msg: ScheduledNotificationMessage,
  control: ConsumerControl
): Promise<void> {
  if (msg.kind !== 'todoReminder') return

  await control.heartbeat()
  const { client } = await getClient(workspaceUuid)
  await control.heartbeat()

  const workslot = await client.findOne(time.class.WorkSlot, { _id: msg.workSlotId })
  if (workslot === undefined) return
  await control.heartbeat()
  const todo = await client.findOne(time.class.ToDo, { _id: msg.todoId })
  if (todo === undefined) return
  if (todo.doneOn != null) return

  const employee = await client.findOne(contact.mixin.Employee, { _id: todo.user, active: true })
  if (employee?.personUuid == null) return
  const user = employee.personUuid

  const space = await client.findOne(contact.class.PersonSpace, { person: todo.user }, { projection: { _id: 1 } })
  if (space === undefined) return
  await control.heartbeat()

  const objectId = todo._id
  const objectClass = todo._class
  const objectSpace = todo.space

  // Ensure doc notify context exists.
  let docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { objectId, user })
  if (docNotifyContext === undefined) {
    const id = await client.createDoc(notification.class.DocNotifyContext, space._id, {
      objectId,
      objectClass,
      objectSpace,
      user,
      isPinned: false,
      hidden: false
    })
    docNotifyContext = await client.findOne(
      notification.class.DocNotifyContext,
      { _id: id },
      { projection: { _id: 1 } }
    )
    if (docNotifyContext === undefined) return
  }

  // Idempotency: if this timer already created a notification, skip.
  // We key by (docNotifyContext,user,msg.id) via intlParams; this avoids needing deterministic _id.
  const existing = await client.findOne(notification.class.CommonInboxNotification, {
    docNotifyContext: docNotifyContext._id,
    user,
    'intlParams.timerId': msg.id
  } as any)
  if (existing !== undefined) return

  await control.heartbeat()
  await client.createDoc(notification.class.CommonInboxNotification, space._id, {
    user,
    objectId,
    objectClass,
    icon: time.icon.Planned,
    header: time.string.ToDo,
    message: time.string.ToDo,
    messageHtml: jsonToMarkup(nodeDoc(nodeParagraph(nodeText(todo.title)))),
    intlParams: {
      timerId: msg.id
    },
    types: [modelTime.ids.ToDoReminder],
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContext._id
  } as any)

  ctx.info('Scheduled notification created', {
    kind: msg.kind,
    id: msg.id,
    workSlotId: msg.workSlotId,
    todoId: msg.todoId,
    user,
    spaceId: space._id
  })
}
