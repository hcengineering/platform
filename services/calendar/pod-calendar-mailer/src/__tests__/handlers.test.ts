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
import { MeasureContext, PersonId, Ref, WorkspaceUuid } from '@hcengineering/core'
import { Meeting, Room } from '@hcengineering/love'
import { MeetingNotificationType } from '../notification'
import { eventCreated, eventUpdated, eventDeleted, eventMixin } from '../handlers'
import * as notification from '../notification'

const ws = 'workspace-id' as WorkspaceUuid
const meetingHost = 'meeting-host' as PersonId
const meetingGuest = 'meeting-guest' as PersonId
const room = 'room-id' as Ref<Room>
const ctx = {
  error: jest.fn(),
  info: jest.fn()
} as unknown as MeasureContext

function eventFor (user: PersonId, props?: Partial<Event> | Partial<Meeting>): Event {
  return {
    _id: 'test-event',
    user,
    date: Date.now() + 3600000,
    ...props
  } as any as Event
}

function pastDate (): number {
  return Date.now() - 3600000
}

jest.mock('../notification', () => {
  const actual = jest.requireActual('../notification')
  return {
    ...actual,
    ...actual.default,
    createNotification: jest.fn()
  }
})

jest.mock('../utils', () => {
  const actual = jest.requireActual('../utils')
  return {
    ...actual,
    ...actual.default,
    isMeeting: jest.fn((ws: WorkspaceUuid, event: Event): Promise<boolean> => {
      return Promise.resolve((event as any as Meeting).room !== undefined)
    })
  }
})

describe('queue message handlers', () => {
  const createNotificationSpy = jest.spyOn(notification, 'createNotification')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    createNotificationSpy.mockRestore()
  })

  describe('eventCreated', () => {
    test('there should not be notification when host creates event for himself', async () => {
      const event = eventFor(meetingHost)

      await eventCreated(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should not be notification when host creates event for guest', async () => {
      const event = eventFor(meetingGuest)

      await eventCreated(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should be notification when host creates meeting for guest', async () => {
      // This happens when the host adds a new participant to the existing meeting
      // A new event which is already a meeting is created for the new participant
      const event = eventFor(meetingGuest, { room })

      await eventCreated(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).toHaveBeenCalledWith(ctx, ws, MeetingNotificationType.Scheduled, event, meetingHost)
    })

    test('there should not be notification when host creates meeting for guest in the past', async () => {
      // This happens when the host adds a new participant to the existing meeting
      // A new event which is already a meeting is created for the new participant
      const event = eventFor(meetingGuest, { room, date: pastDate() })

      await eventCreated(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })
  })

  describe('eventUpdated', () => {
    test('there should be notification when host updates event for himself', async () => {
      const event = eventFor(meetingHost)

      await eventUpdated(ctx, ws, { event, modifiedBy: meetingHost, changes: { date: Date.now() } })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should not be notification when host updates event for guest', async () => {
      const event = eventFor(meetingGuest)

      await eventUpdated(ctx, ws, { event, modifiedBy: meetingHost, changes: { date: Date.now() } })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should be notification when host updates meeting for guest', async () => {
      const event = eventFor(meetingGuest, { room })

      await eventUpdated(ctx, ws, { event, modifiedBy: meetingHost, changes: { date: Date.now() } })

      expect(createNotificationSpy).toHaveBeenCalledWith(
        ctx,
        ws,
        MeetingNotificationType.Rescheduled,
        event,
        meetingHost
      )
    })

    test('there should be notification when host updates meeting for guest in the past', async () => {
      const event = eventFor(meetingGuest, { room, date: pastDate() })

      await eventUpdated(ctx, ws, { event, modifiedBy: meetingHost, changes: { date: Date.now() } })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should not be notification when host updates meeting for himself', async () => {
      const event = eventFor(meetingHost, { room })

      await eventUpdated(ctx, ws, { event, modifiedBy: meetingHost, changes: { date: Date.now() } })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })
  })

  describe('eventDeleted', () => {
    test('there should not be notification when host deletes event for himself', async () => {
      const event = eventFor(meetingHost)

      await eventDeleted(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should not be notification when host deletes event for guest', async () => {
      const event = eventFor(meetingGuest)

      await eventDeleted(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should be notification when host deletes meeting for guest', async () => {
      const event = eventFor(meetingGuest, { room })

      await eventDeleted(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).toHaveBeenCalledWith(ctx, ws, MeetingNotificationType.Canceled, event, meetingHost)
    })

    test('there should not be notification when host deletes meeting for guest in the past', async () => {
      const event = eventFor(meetingGuest, { room, date: pastDate() })

      await eventDeleted(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should not be notification when host deletes meeting for himself', async () => {
      const event = eventFor(meetingHost, { room })

      await eventDeleted(ctx, ws, { event, modifiedBy: meetingHost })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })
  })

  describe('eventMixin', () => {
    test('there should not be notification when event not created before mixin', async () => {
      const event = eventFor(meetingGuest)

      await eventMixin(ctx, ws, { event, modifiedBy: meetingHost, changes: { room } })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })

    test('there should be notification when host create meeting for guest', async () => {
      const event0 = eventFor(meetingGuest)
      await eventCreated(ctx, ws, { event: event0, modifiedBy: meetingHost })

      const event = eventFor(meetingGuest, { room })
      await eventMixin(ctx, ws, { event, modifiedBy: meetingHost, changes: { room } })

      expect(createNotificationSpy).toHaveBeenCalledWith(ctx, ws, MeetingNotificationType.Scheduled, event, meetingHost)
    })

    test('there should not be notification when host created meeting for himself', async () => {
      const event0 = eventFor(meetingHost)
      await eventCreated(ctx, ws, { event: event0, modifiedBy: meetingHost })

      const event = eventFor(meetingHost, { room })
      await eventMixin(ctx, ws, { event, modifiedBy: meetingHost, changes: { room } })

      expect(createNotificationSpy).not.toHaveBeenCalled()
    })
  })
})
