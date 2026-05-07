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

import contact, { type Person, type PersonSpace } from '@hcengineering/contact'
import core, {
  type AccountUuid,
  type Class,
  type Doc,
  type MeasureContext,
  type PersonId,
  type Ref,
  type Space,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { ConsumerControl } from '@hcengineering/server-core'
import notification, { type CommonInboxNotification, type DocNotifyContext } from '@hcengineering/notification'
import modelTime from '@hcengineering/model-time'
import { jsonToMarkup, nodeDoc, nodeParagraph, nodeText } from '@hcengineering/text-core'
import time, { type ToDo } from '@hcengineering/time'
import { getClient, type ClientBundle } from './client'
import type { ScheduledNotificationMessage } from './types'

interface MinimalEvent extends Doc {
  attachedTo?: Ref<Doc>
  attachedToClass?: Ref<Class<Doc>>
  user?: PersonId
  title?: string
}

export function buildReminderNotificationId (timerId: string): Ref<CommonInboxNotification> {
  return `eventReminderInbox:${timerId}` as Ref<CommonInboxNotification>
}

interface ReminderTarget {
  objectId: Ref<any>
  objectClass: Ref<Class<any>>
  objectSpace: Ref<Space>
  titleText: string
  receiverAccount: AccountUuid
  receiverSpace: Ref<PersonSpace>
}

export async function handleScheduledNotification (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  msg: ScheduledNotificationMessage,
  control: ConsumerControl
): Promise<void> {
  if (msg.kind !== 'eventReminder') return

  await control.heartbeat()
  const bundle = await getClient(workspaceUuid)
  const { client } = bundle
  await control.heartbeat()

  const event = (await client.findOne(msg.eventClass, { _id: msg.eventId })) as MinimalEvent | undefined
  if (event === undefined) return
  await control.heartbeat()

  const target = await resolveReminderTarget(bundle, event)
  if (target === undefined) return
  await control.heartbeat()

  // Idempotency: short-circuit if a notification for this exact timer was already created.
  const notificationId = buildReminderNotificationId(msg.id)
  const existing = await client.findOne(
    notification.class.CommonInboxNotification,
    { _id: notificationId },
    { projection: { _id: 1 } }
  )
  if (existing !== undefined) return

  // Ensure doc notify context exists.
  let docNotifyContext: Pick<DocNotifyContext, '_id'> | undefined = await client.findOne(
    notification.class.DocNotifyContext,
    { objectId: target.objectId, user: target.receiverAccount },
    { projection: { _id: 1 } }
  )
  if (docNotifyContext === undefined) {
    try {
      const id = await client.createDoc(
        notification.class.DocNotifyContext,
        target.receiverSpace,
        {
          objectId: target.objectId,
          objectClass: target.objectClass,
          objectSpace: target.objectSpace,
          user: target.receiverAccount,
          isPinned: false,
          hidden: false
        },
        undefined,
        undefined,
        // System tokens may not have a populated `socialIds[0]`; if we let the rest tx client default
        // to that, `Tx.modifiedBy` becomes `undefined` and the transactor rejects the request with
        // HTTP 400 "Bad Request" out of `NormalizeTxMiddleware.parseBaseTx`. Always pin to a known PersonId.
        core.account.System
      )
      docNotifyContext = { _id: id }
    } catch (err) {
      ctx.error('Failed to create DocNotifyContext for event reminder', {
        err,
        timerId: msg.id,
        eventId: msg.eventId,
        eventClass: msg.eventClass,
        spaceId: target.receiverSpace,
        user: target.receiverAccount
      })
      throw err
    }
  }

  await control.heartbeat()
  try {
    await client.createDoc(
      notification.class.CommonInboxNotification,
      target.receiverSpace,
      {
        user: target.receiverAccount,
        objectId: target.objectId,
        objectClass: target.objectClass,
        headerIcon: time.icon.Planned,
        header: time.string.ToDo,
        message: time.string.ToDo,
        messageHtml: jsonToMarkup(nodeDoc(nodeParagraph(nodeText(target.titleText)))),
        types: [modelTime.ids.ToDoReminder],
        isViewed: false,
        archived: false,
        docNotifyContext: docNotifyContext._id
      },
      notificationId,
      undefined,
      core.account.System
    )
  } catch (err) {
    ctx.error('Failed to create CommonInboxNotification for event reminder', {
      err,
      timerId: msg.id,
      eventId: msg.eventId,
      eventClass: msg.eventClass,
      notificationId,
      spaceId: target.receiverSpace,
      user: target.receiverAccount
    })
    throw err
  }

  ctx.info('Scheduled notification created', {
    kind: msg.kind,
    id: msg.id,
    eventId: msg.eventId,
    eventClass: msg.eventClass,
    notificationId,
    user: target.receiverAccount,
    spaceId: target.receiverSpace
  })
}

async function resolveReminderTarget (bundle: ClientBundle, event: MinimalEvent): Promise<ReminderTarget | undefined> {
  const { client, accountClient } = bundle

  if (event.attachedToClass === time.class.ToDo) {
    const todo = await client.findOne(time.class.ToDo, { _id: event.attachedTo as Ref<ToDo> })
    if (todo === undefined) return undefined
    if (todo.doneOn != null) return undefined

    const employee = await client.findOne(contact.mixin.Employee, { _id: todo.user, active: true })
    if (employee?.personUuid == null) return undefined

    const space = await client.findOne(
      contact.class.PersonSpace,
      { person: todo.user },
      { projection: { _id: 1 } }
    )
    if (space === undefined) return undefined

    return {
      objectId: todo._id,
      objectClass: todo._class,
      objectSpace: todo.space,
      titleText: todo.title ?? '',
      receiverAccount: employee.personUuid,
      receiverSpace: space._id
    }
  }

  // Plain calendar event: receiver is identified by `event.user` (a PersonId / social id).
  const receiverSocialId = event.user
  if (receiverSocialId == null) return undefined

  const personUuid = await accountClient.findPersonBySocialId(receiverSocialId, true)
  if (personUuid == null) return undefined

  const person = await client.findOne(
    contact.class.Person,
    { personUuid },
    { projection: { _id: 1 } }
  )
  if (person === undefined) return undefined

  const space = await client.findOne(
    contact.class.PersonSpace,
    { person: person._id as Ref<Person> },
    { projection: { _id: 1 } }
  )
  if (space === undefined) return undefined

  return {
    objectId: event._id,
    objectClass: event._class,
    objectSpace: event.space,
    titleText: event.title ?? '',
    receiverAccount: personUuid as AccountUuid,
    receiverSpace: space._id
  }
}
