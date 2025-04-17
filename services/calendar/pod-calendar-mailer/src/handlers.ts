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
import { Event } from '@hcengineering/calendar'
import { Data, WorkspaceUuid } from '@hcengineering/core'
import { createNotification, MeetingNotificationType } from './notification'
import { type EventCUDMessage } from './types'
import { isMeeting } from './utils'

const recentlyCreatedEvents = new Set<string>()

export async function eventCreated (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  console.log(`Event ${event._id} for ${event.user} created by ${modifiedBy}`, event)

  if (modifiedBy === event.user) return

  if (await isMeeting(workspaceUuid, event)) {
    // This happens when the host adds a new participant to the existing meeting
    // A new event which is already a meeting is created for the new participant
    console.log(`Meeting ${event._id} for ${event.user} scheduled`)
    await createNotification(workspaceUuid, MeetingNotificationType.Scheduled, event, modifiedBy)
  } else {
    // Don't create notifications for reguar events, only for meetings
    // But the event will be marked as a meeting in a separate call
    // immediately after creation, in the "mixin" message
    recentlyCreatedEvents.add(event._id)
  }
}

export async function eventUpdated (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  console.log(`Event ${event._id} for ${event.user} updated by ${modifiedBy}`, event, message.changes)

  if (modifiedBy === event.user) return

  if (await isMeeting(workspaceUuid, event)) {
    const changes = message.changes as Partial<Data<Event>>
    if (changes.date !== undefined) {
      console.log(`Meeting ${event._id} for ${event.user} rescheduled`)
      await createNotification(workspaceUuid, MeetingNotificationType.Rescheduled, event, modifiedBy)
    }
  }
}

export async function eventDeleted (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  console.log(`Event ${event._id} for ${event.user} deleted by ${modifiedBy}`, event)

  if (modifiedBy === event.user) return

  if (await isMeeting(workspaceUuid, event)) {
    console.log(`Meeting ${event._id} for ${event.user} canceled`)
    await createNotification(workspaceUuid, MeetingNotificationType.Canceled, event, modifiedBy)
  }
}

export async function eventMixin (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  console.log(`Event ${event._id} for ${event.user} mixined by ${modifiedBy}`, event, message.changes)

  if (modifiedBy === event.user) {
    console.log('Event is mixined by the host, skipping notification')
    return
  }

  if (recentlyCreatedEvents.has(event._id)) {
    recentlyCreatedEvents.delete(event._id)

    if (await isMeeting(workspaceUuid, event)) {
      console.log(`Meeting ${event._id} for ${event.user} scheduled`)
      await createNotification(workspaceUuid, MeetingNotificationType.Scheduled, event, modifiedBy)
    } else {
      console.log(`Event ${event._id} for ${event.user} is not a meeting`)
    }
  } else {
    console.log('Event is not newly created, skipping notification')
  }
}
