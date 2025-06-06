//
// Copyright © 2025 Hardcore Engineering Inc.
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
import calendar, { Event } from '@hcengineering/calendar'
import contact from '@hcengineering/contact'
import { AccountUuid, Doc, MeasureContext, PersonId, Ref, Space, WorkspaceUuid } from '@hcengineering/core'
import notification from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'
import { getClient } from './utils'

export enum MeetingNotificationType {
  Scheduled = 'meeting-scheduled',
  Rescheduled = 'meeting-rescheduled',
  Canceled = 'meeting-canceled'
}

const notificationMessages: Record<MeetingNotificationType, IntlString> = {
  [MeetingNotificationType.Scheduled]: calendar.string.MeetingScheduledNotification,
  [MeetingNotificationType.Rescheduled]: calendar.string.MeetingRescheduledNotification,
  [MeetingNotificationType.Canceled]: calendar.string.MeetingCanceledNotification
}

export async function createNotification (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  type: MeetingNotificationType,
  forEvent: Event,
  modifiedBy: PersonId
): Promise<void> {
  const { client, accountClient } = await getClient(workspaceUuid)
  const personUuid = await accountClient.findPersonBySocialId(forEvent.user, true)
  if (personUuid === undefined) {
    throw new Error(`Global person not found for social-id ${forEvent.user}`)
  }
  const person = await client.findOne(contact.class.Person, { personUuid }, { projection: { _id: 1 } })
  if (person === undefined) {
    throw new Error(`Local person not found for person-uuid ${personUuid}`)
  }
  const space = await client.findOne(contact.class.PersonSpace, { person: person._id }, { projection: { _id: 1 } })
  if (space === undefined) {
    throw new Error(`Person space not found for person ${person._id}`)
  }

  const user = personUuid as AccountUuid
  let objectId: Ref<Doc<Space>> = forEvent._id
  let objectClass = forEvent._class
  let objectSpace = forEvent.space

  if (type === MeetingNotificationType.Canceled) {
    const calendr = await client.findOne(
      calendar.class.Calendar,
      { _id: forEvent.calendar },
      { projection: { _id: 1 } }
    )
    if (calendr === undefined) {
      throw new Error(`Calendar not found for event ${forEvent._id}`)
    }
    objectId = calendr._id
    objectClass = calendar.class.Calendar
    objectSpace = calendr.space
  }

  const docNotifyContext = await client.findOne(notification.class.DocNotifyContext, { objectId, user })
  let docNotifyContextId = docNotifyContext?._id
  if (docNotifyContextId === undefined) {
    docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, space._id, {
      objectId,
      objectClass,
      objectSpace,
      user,
      isPinned: false,
      hidden: false
    })
  }

  if (notificationMessages[type] === undefined) {
    throw new Error('Invalid notification type')
  }

  // Here we need another client with that account who created the event
  // to make the notification in the inbox displaying the author name
  const { client: txClient } = await getClient(workspaceUuid, modifiedBy)

  await txClient.createDoc(notification.class.CommonInboxNotification, space._id, {
    user,
    objectId,
    objectClass,
    icon: calendar.icon.Calendar,
    message: notificationMessages[type],
    props: { title: forEvent.title },
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContextId
  })

  ctx.info('Notification created', {
    personUuid,
    eventId: forEvent.eventId,
    objectId: forEvent._id,
    spaceId: space._id
  })
}
