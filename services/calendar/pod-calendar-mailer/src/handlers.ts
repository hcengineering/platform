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

const recentlyCreatedEvents = new Map<string, number>()

function addRecentEvent (eventId: string): void {
  recentlyCreatedEvents.set(eventId, Date.now())

  const now = Date.now()
  const deleteIds: string[] = []
  for (const [eventId, timestamp] of recentlyCreatedEvents.entries()) {
    if (now - timestamp > 60_000) {
      deleteIds.push(eventId)
    }
  }
  for (const eventId of deleteIds) {
    recentlyCreatedEvents.delete(eventId)
  }
}

export async function eventCreated (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  // TODO: move emailing logic from huly-schedule here

  if (event.date <= Date.now()) return

  if (modifiedBy !== event.user) {
    if (await isMeeting(workspaceUuid, event)) {
      // This happens when the host adds a new participant to the existing meeting
      // A new event which is already a meeting is created for the new participant
      await createNotification(workspaceUuid, MeetingNotificationType.Scheduled, event, modifiedBy)
    } else {
      // Don't create notifications for reguar events, only for meetings
      // But the event will be marked as a meeting in a separate call
      // immediately after creation, in the "mixin" message
      addRecentEvent(event._id)
    }
  }
}

export async function eventUpdated (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  // TODO: if the event was created via huly-schedule, we need to send an email

  if (event.date <= Date.now()) return

  if (modifiedBy !== event.user) {
    if (await isMeeting(workspaceUuid, event)) {
      const changes = message.changes as Partial<Data<Event>>
      if (changes.date !== undefined) {
        await createNotification(workspaceUuid, MeetingNotificationType.Rescheduled, event, modifiedBy)
      }
    }
  }
}

export async function eventDeleted (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  // TODO: if the event was created via huly-schedule, we need to send an email

  if (event.date <= Date.now()) return

  if (modifiedBy !== event.user) {
    if (await isMeeting(workspaceUuid, event)) {
      await createNotification(workspaceUuid, MeetingNotificationType.Canceled, event, modifiedBy)
    }
  }
}

export async function eventMixin (
  workspaceUuid: WorkspaceUuid,
  message: Omit<EventCUDMessage, 'action'>
): Promise<void> {
  const { event, modifiedBy } = message

  // TODO: move emailing logic from huly-schedule here

  if (modifiedBy !== event.user) {
    if (recentlyCreatedEvents.has(event._id)) {
      recentlyCreatedEvents.delete(event._id)

      if (await isMeeting(workspaceUuid, event)) {
        await createNotification(workspaceUuid, MeetingNotificationType.Scheduled, event, modifiedBy)
      }
    }
  }
}
