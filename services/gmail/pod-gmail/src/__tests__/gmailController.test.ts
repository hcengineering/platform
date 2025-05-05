/* eslint-disable @typescript-eslint/unbound-method */
//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { GmailController } from '../gmailController'
import { GmailClient } from '../gmail'
import { WorkspaceClient } from '../workspaceClient'
import { Token } from '../types'
import * as integrations from '../integrations'
import * as tokens from '../tokens'
import * as serverClient from '@hcengineering/server-client'

jest.mock('../workspaceClient')
jest.mock('../gmail')
jest.mock('../integrations')
jest.mock('../tokens')
jest.mock('@hcengineering/server-client')
jest.mock('../utils')

describe('GmailController', () => {
  let gmailController: GmailController
  let mockCtx: MeasureContext
  let mockStorageAdapter: StorageAdapter
  let mockWorkspaceClient: jest.Mocked<WorkspaceClient>
  let mockGmailClients: Map<string, jest.Mocked<GmailClient>>

  const workspaceAId: WorkspaceUuid = 'workspace-a' as any
  const workspaceBId: WorkspaceUuid = 'workspace-b' as any

  const workspaceATokens: Token[] = [
    { userId: 'user1', workspace: workspaceAId, token: 'token1' } as any,
    { userId: 'user2', workspace: workspaceAId, token: 'token2' } as any
  ]

  const workspaceBTokens: Token[] = [
    { userId: 'user3', workspace: workspaceBId, token: 'token3' } as any,
    { userId: 'user4', workspace: workspaceBId, token: 'token4' } as any,
    { userId: 'user5', workspace: workspaceBId, token: 'token5' } as any
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockCtx = {
      info: (message: string, details: any) => {
        console.log(message, details)
      },
      error: (message: string, details: any) => {
        console.error(message, details)
      },
      warn: (message: string, details: any) => {
        console.warn(message, details)
      }
    } as unknown as MeasureContext

    mockStorageAdapter = {} as unknown as StorageAdapter

    mockWorkspaceClient = {
      createGmailClient: jest.fn(),
      checkUsers: jest.fn().mockResolvedValue(undefined),
      getNewMessages: jest.fn().mockResolvedValue(undefined),
      close: jest.fn()
    } as unknown as jest.Mocked<WorkspaceClient>

    // Create mock clients with unique properties
    mockGmailClients = new Map()

    const allUsers = [...workspaceATokens, ...workspaceBTokens].map((token) => token.userId)
    allUsers.forEach((userId) => {
      mockGmailClients.set(userId, {
        startSync: jest.fn().mockResolvedValue(undefined),
        sync: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        getUserEmail: jest.fn().mockReturnValue(`${userId}@example.com`)
      } as unknown as jest.Mocked<GmailClient>)
    })

    // Mock WorkspaceClient.create
    jest.spyOn(WorkspaceClient, 'create').mockResolvedValue(mockWorkspaceClient)

    // Mock getIntegrations
    jest
      .spyOn(integrations, 'getIntegrations')
      .mockResolvedValue([
        { workspaceUuid: workspaceAId, socialId: 'user1' } as any,
        { workspaceUuid: workspaceAId, socialId: 'user2' } as any,
        { workspaceUuid: workspaceBId, socialId: 'user3' } as any,
        { workspaceUuid: workspaceBId, socialId: 'user4' } as any,
        { workspaceUuid: workspaceBId, socialId: 'user5' } as any
      ])

    // Mock getWorkspaceTokens
    jest.spyOn(tokens, 'getWorkspaceTokens').mockImplementation(async (_, workspaceId) => {
      if (workspaceId === workspaceAId) return workspaceATokens
      if (workspaceId === workspaceBId) return workspaceBTokens
      return []
    })

    // Mock getAccountClient
    jest.spyOn(serverClient, 'getAccountClient').mockReturnValue({
      getWorkspaceInfo: jest.fn().mockResolvedValue({ mode: 'active' })
    } as any)

    // Mock serviceToken
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.spyOn(require('../utils'), 'serviceToken').mockReturnValue('test-token')

    // Mock JSON.parse
    jest.spyOn(JSON, 'parse').mockReturnValue({
      web: { client_id: 'id', client_secret: 'secret', redirect_uris: ['uri'] }
    })

    // Create GmailController
    gmailController = GmailController.create(mockCtx, mockStorageAdapter)

    // Mock createGmailClient to return appropriate mock client
    mockWorkspaceClient.createGmailClient.mockImplementation(async (token: Token) => {
      const client = mockGmailClients.get(token.userId)
      if (client == null) {
        throw new Error(`No mock client for userId: ${token.userId}`)
      }
      return client
    })
  })

  it('should create clients for all tokens without duplicates', async () => {
    // Execute startAll
    await gmailController.startAll()

    // Verify workspaces were created
    expect(WorkspaceClient.create).toHaveBeenCalledTimes(2)
    expect(WorkspaceClient.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      mockStorageAdapter,
      workspaceAId
    )
    expect(WorkspaceClient.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      mockStorageAdapter,
      workspaceBId
    )

    // Verify createGmailClient called 5 times
    expect(mockWorkspaceClient.createGmailClient).toHaveBeenCalledTimes(5)
  })
})
