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
import type { ParsedRoomName } from '@hcengineering/love'
import { WebhookEvent } from 'livekit-server-sdk'
import { WebhookProcessor } from '../webhook'
import { isSupportedWebhookEvent } from '../webhookEvents'
import { WorkspaceClient } from '../workspaceClient'

jest.mock('../config', () => ({ __esModule: true, default: {} }))
jest.mock('../utils', () => ({ parseParticipantMetadata: jest.fn() }))
jest.mock('../billing', () => ({ saveLiveKitEgressBilling: jest.fn() }))
jest.mock('../storage', () => ({ saveFile: jest.fn() }))
jest.mock('../workspaceClient', () => ({ WorkspaceClient: { create: jest.fn() } }))

describe('webhook event filtering', () => {
  const ctx = { info: jest.fn(), error: jest.fn() }
  const roomName: ParsedRoomName = {
    workspace: 'foreign-workspace' as ParsedRoomName['workspace'],
    meetingId: 'meeting' as ParsedRoomName['meetingId']
  }
  const createWorkspaceClient = jest.spyOn(WorkspaceClient, 'create')
  const workspaceClient: Partial<WorkspaceClient> = {}
  const roomClient: Partial<ConstructorParameters<typeof WebhookProcessor>[1]> = {}
  const eventProducer: Partial<ConstructorParameters<typeof WebhookProcessor>[2]> = {}
  const egressClient: Partial<ConstructorParameters<typeof WebhookProcessor>[3]> = {}

  function makeProcessor (): WebhookProcessor {
    return new WebhookProcessor(
      ctx as unknown as MeasureContext,
      roomClient as ConstructorParameters<typeof WebhookProcessor>[1],
      eventProducer as ConstructorParameters<typeof WebhookProcessor>[2],
      egressClient as ConstructorParameters<typeof WebhookProcessor>[3],
      undefined,
      undefined
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    createWorkspaceClient.mockResolvedValue(workspaceClient as WorkspaceClient)
  })

  it.each(['track_published', 'track_unpublished', 'participant_connection_aborted', 'future_event', ''])(
    'ignores %s without opening a workspace',
    async (event) => {
      expect(isSupportedWebhookEvent(event)).toBe(false)
      await makeProcessor().processEvent(Object.assign(new WebhookEvent(), { event }), roomName)
      expect(createWorkspaceClient).not.toHaveBeenCalled()
      expect(ctx.error).not.toHaveBeenCalled()
    }
  )

  it.each(['participant_joined', 'participant_left'])('still dispatches %s to its workspace', async (event) => {
    await makeProcessor().processEvent(Object.assign(new WebhookEvent(), { event }), roomName)
    expect(createWorkspaceClient).toHaveBeenCalledWith(roomName.workspace, ctx)
  })
})
