//
// Copyright © 2026 TraceX SAS.
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
import type { MeasureContext } from '@hcengineering/core'
import { WebhookEvent } from 'livekit-server-sdk'
import { isSupportedWebhookEvent, routeWebhookEvent, SUPPORTED_WEBHOOK_EVENTS } from '../webhookEvents'

describe('webhook event routing', () => {
  const ctx = { debug: jest.fn(), info: jest.fn(), error: jest.fn() }
  const projectKey = 'project'

  function makeEvent (event: string, room?: { name: string, metadata?: string }): WebhookEvent {
    return Object.assign(new WebhookEvent(), { event, room })
  }

  function route (event: WebhookEvent): ReturnType<typeof routeWebhookEvent> {
    return routeWebhookEvent(ctx as unknown as MeasureContext, event, projectKey)
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(SUPPORTED_WEBHOOK_EVENTS)('supports %s', (event) => {
    expect(isSupportedWebhookEvent(event)).toBe(true)
  })

  it.each(['track_published', 'track_unpublished', 'participant_connection_aborted', 'future_event', ''])(
    'drops unsupported %s before inspecting the room',
    (event) => {
      // Metadata is invalid JSON: an unsupported event must be dropped before it is parsed.
      expect(route(makeEvent(event, { name: 'ws_meeting', metadata: '{' }))).toBeUndefined()
      expect(ctx.debug).toHaveBeenCalledWith('Ignoring unsupported webhook event type', { event })
      expect(ctx.error).not.toHaveBeenCalled()
    }
  )

  it('routes a supported event to its workspace and meeting', () => {
    const routed = route(makeEvent('participant_joined', { name: 'ws_meeting' }))
    expect(routed?.roomName).toEqual({ workspace: 'ws', meetingId: 'meeting' })
    expect(routed?.event.event).toBe('participant_joined')
  })

  it('drops supported events from a different LiveKit project', () => {
    const metadata = JSON.stringify({ projectKey: 'other-project' })
    expect(route(makeEvent('room_started', { name: 'ws_meeting', metadata }))).toBeUndefined()
  })

  it('drops supported events with an unparseable room name', () => {
    expect(route(makeEvent('room_started', { name: 'no-separator' }))).toBeUndefined()
  })
})
