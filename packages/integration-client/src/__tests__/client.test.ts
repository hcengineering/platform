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

import { IntegrationKind, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { Integration, IntegrationKey, type AccountClient } from '@hcengineering/account-client'
import { IntegrationClientImpl } from '../client'
import { IntegrationClient } from '../types'

// Mock the events module before importing anything else
const mockEvents = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}

jest.mock('../events', () => ({
  getIntegrationEventBus: () => mockEvents
}))

// Mock account client
const mockAccountClient: jest.Mocked<AccountClient> = {
  listIntegrations: jest.fn(),
  getIntegration: jest.fn(),
  createIntegration: jest.fn(),
  updateIntegration: jest.fn(),
  deleteIntegration: jest.fn()
} as any

const integrationKind: IntegrationKind = 'gmail' as IntegrationKind
const serviceName = 'gmail-service'
const testSocialId: PersonId = 'social-123' as PersonId
const testWorkspaceId: WorkspaceUuid = 'workspace-456' as WorkspaceUuid

describe('IntegrationClientImpl', () => {
  let client: IntegrationClient

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock event handlers
    mockEvents.on.mockReturnValue(() => {})
    mockEvents.off.mockImplementation(() => {})
    mockEvents.emit.mockImplementation(() => {})

    client = new IntegrationClientImpl(mockAccountClient, integrationKind, serviceName)
  })

  describe('getIntegrations', () => {
    it('should return integrations from account client', async () => {
      const mockIntegrations: Integration[] = [
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: { test: true }
        }
      ]

      mockAccountClient.listIntegrations.mockResolvedValue(mockIntegrations)

      const result = await client.getIntegrations()

      expect(mockAccountClient.listIntegrations).toHaveBeenCalledWith({ kind: integrationKind })
      expect(result).toEqual(mockIntegrations)
    })

    it('should return empty array when account client returns null', async () => {
      mockAccountClient.listIntegrations.mockResolvedValue([])

      const result = await client.getIntegrations()

      expect(result).toEqual([])
    })
  })

  describe('getConnection', () => {
    it('should return integration if it is already a connection', async () => {
      const connectionIntegration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: { isConnection: true }
      }

      const result = await client.getConnection(connectionIntegration)

      expect(result).toBe(connectionIntegration)
      expect(mockAccountClient.getIntegration).not.toHaveBeenCalled()
    })

    it('should fetch connection for non-connection integration', async () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: { test: true }
      }

      const connectionIntegration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: { isConnection: true }
      }

      mockAccountClient.getIntegration.mockResolvedValue(connectionIntegration)

      const result = await client.getConnection(integration)

      expect(mockAccountClient.getIntegration).toHaveBeenCalledWith({
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null
      })
      expect(result).toBe(connectionIntegration)
    })

    it('should emit error event and rethrow when getIntegration fails', async () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: { test: true }
      }

      const error = new Error('Connection failed')
      mockAccountClient.getIntegration.mockRejectedValue(error)

      await expect(client.getConnection(integration)).rejects.toThrow('Connection failed')

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:error',
        expect.objectContaining({
          operation: 'connect',
          error: 'Connection failed',
          socialId: testSocialId,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('integrate', () => {
    it('should create new integration when none exists', async () => {
      const connection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: { _id: 'conn-123', other: 'data' }
      }

      mockAccountClient.getIntegration.mockResolvedValue(null)
      mockAccountClient.createIntegration.mockResolvedValue(undefined)

      const result = await client.integrate(connection, testWorkspaceId)

      expect(mockAccountClient.createIntegration).toHaveBeenCalledWith(
        expect.objectContaining({
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: expect.objectContaining({
            connectionId: 'conn-123',
            _id: expect.any(String),
            other: 'data'
          })
        })
      )

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:created',
        expect.objectContaining({
          integration: expect.any(Object),
          timestamp: expect.any(Number)
        })
      )

      expect(result).toEqual(
        expect.objectContaining({
          socialId: testSocialId,
          workspaceUuid: testWorkspaceId
        })
      )
    })

    it('should return existing integration when it already exists', async () => {
      const connection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: { _id: 'conn-123' }
      }

      const existingIntegration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: { existing: true }
      }

      mockAccountClient.getIntegration.mockResolvedValue(existingIntegration)

      const result = await client.integrate(connection, testWorkspaceId)

      expect(mockAccountClient.createIntegration).not.toHaveBeenCalled()
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:updated',
        expect.objectContaining({
          integration: expect.any(Object),
          timestamp: expect.any(Number)
        })
      )
      expect(result).toBe(existingIntegration)
    })

    it('should emit error event when integration fails', async () => {
      const connection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: {}
      }

      const error = new Error('Integration failed')
      mockAccountClient.getIntegration.mockRejectedValue(error)

      await expect(client.integrate(connection, testWorkspaceId)).rejects.toThrow('Integration failed')

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:error',
        expect.objectContaining({
          operation: 'integrate',
          error: 'Integration failed',
          workspaceUuid: testWorkspaceId,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('connect', () => {
    it('should create new connection when none exists', async () => {
      mockAccountClient.getIntegration.mockResolvedValue(null)
      mockAccountClient.createIntegration.mockResolvedValue(undefined)

      const data = { test: 'data' }
      const result = await client.connect(testSocialId, data)

      expect(mockAccountClient.createIntegration).toHaveBeenCalledWith({
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data
      })

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'connection:created',
        expect.objectContaining({
          integration: expect.objectContaining({
            socialId: testSocialId,
            workspaceUuid: null
          }),
          timestamp: expect.any(Number)
        })
      )

      expect(result).toEqual(
        expect.objectContaining({
          socialId: testSocialId,
          workspaceUuid: null,
          data
        })
      )
    })

    it('should return existing connection when it already exists', async () => {
      const existingConnection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: { existing: true }
      }

      mockAccountClient.getIntegration.mockResolvedValue(existingConnection)

      const result = await client.connect(testSocialId)

      expect(mockAccountClient.createIntegration).not.toHaveBeenCalled()
      expect(mockAccountClient.updateIntegration).not.toHaveBeenCalled()
      expect(result).toBe(existingConnection)
    })

    it('should update existing connection when data is different', async () => {
      const existingConnection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: { existing: true, version: 1 }
      }

      const newData = { existing: true, version: 2, newField: 'value' }
      const updatedConnection = {
        ...existingConnection,
        data: newData
      }

      mockAccountClient.getIntegration.mockResolvedValue(existingConnection)
      mockAccountClient.updateIntegration.mockResolvedValue(undefined)

      const result = await client.connect(testSocialId, newData)

      expect(mockAccountClient.createIntegration).not.toHaveBeenCalled()
      expect(mockAccountClient.updateIntegration).toHaveBeenCalledWith(updatedConnection)

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'connection:updated',
        expect.objectContaining({
          integration: expect.objectContaining({
            data: newData
          }),
          timestamp: expect.any(Number)
        })
      )

      expect(result).toEqual(updatedConnection)
    })

    it('should not update existing connection when data is the same', async () => {
      const existingData = { existing: true, version: 1 }
      const existingConnection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: existingData
      }

      mockAccountClient.getIntegration.mockResolvedValue(existingConnection)

      const result = await client.connect(testSocialId, existingData)

      expect(mockAccountClient.createIntegration).not.toHaveBeenCalled()
      expect(mockAccountClient.updateIntegration).not.toHaveBeenCalled()
      expect(mockEvents.emit).not.toHaveBeenCalledWith('connection:updated', expect.any(Object))
      expect(result).toBe(existingConnection)
    })

    it('should emit error event when connect fails', async () => {
      const error = new Error('Connect failed')
      mockAccountClient.getIntegration.mockRejectedValue(error)

      await expect(client.connect(testSocialId)).rejects.toThrow('Connect failed')

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:error',
        expect.objectContaining({
          operation: 'connect',
          error: 'Connect failed',
          socialId: testSocialId,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('updateConfig', () => {
    it('should update integration config', async () => {
      const integrationKey: IntegrationKey = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId
      }

      const existingIntegration: Integration = {
        ...integrationKey,
        data: { config: { old: true }, other: 'data' }
      }

      const newConfig = { new: true }
      const refreshFn = jest.fn().mockResolvedValue(undefined)

      mockAccountClient.getIntegration.mockResolvedValue(existingIntegration)
      mockAccountClient.updateIntegration.mockResolvedValue(undefined)

      await client.updateConfig(integrationKey, newConfig, refreshFn)

      expect(mockAccountClient.updateIntegration).toHaveBeenCalledWith({
        ...existingIntegration,
        data: {
          config: newConfig,
          other: 'data'
        }
      })

      expect(refreshFn).toHaveBeenCalled()

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:updated',
        expect.objectContaining({
          integration: existingIntegration,
          oldConfig: { old: true },
          newConfig,
          timestamp: expect.any(Number)
        })
      )
    })

    it('should throw error when integration not found', async () => {
      const integrationKey: IntegrationKey = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId
      }

      mockAccountClient.getIntegration.mockResolvedValue(null)

      await expect(client.updateConfig(integrationKey, {})).rejects.toThrow('Integration not found')

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:error',
        expect.objectContaining({
          operation: 'updateConfig',
          integrationKey,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('removeIntegration', () => {
    it('should return undefined when socialId is null', async () => {
      const result = await client.removeIntegration(null, testWorkspaceId)
      expect(result).toBeUndefined()
    })

    it('should remove integration and keep connection', async () => {
      const integrations: Integration[] = [
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: {}
        }
      ]

      const remainingIntegrations: Integration[] = [
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: null, // connection
          data: {}
        },
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: 'other-workspace' as WorkspaceUuid,
          data: {}
        }
      ]

      mockAccountClient.listIntegrations
        .mockResolvedValueOnce(integrations)
        .mockResolvedValueOnce(remainingIntegrations)

      const result = await client.removeIntegration(testSocialId, testWorkspaceId)

      expect(mockAccountClient.deleteIntegration).toHaveBeenCalledWith({
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId
      })

      expect(result).toEqual({ connectionRemoved: false })
    })

    it('should remove integration and connection when it was the last one', async () => {
      const integrations: Integration[] = [
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: {}
        }
      ]

      const remainingIntegrations: Integration[] = [
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: null, // connection only
          data: {}
        }
      ]

      mockAccountClient.listIntegrations
        .mockResolvedValueOnce(integrations)
        .mockResolvedValueOnce(remainingIntegrations)
        .mockResolvedValueOnce([]) // after removing connection

      const result = await client.removeIntegration(testSocialId, testWorkspaceId)

      expect(result).toEqual({ connectionRemoved: true })
    })
  })

  describe('removeConnection', () => {
    it('should remove all integrations for the connection', async () => {
      const connection: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: {}
      }

      const integrations: Integration[] = [
        connection,
        {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: {}
        }
      ]

      mockAccountClient.listIntegrations.mockResolvedValue(integrations)

      await client.removeConnection(connection)

      expect(mockAccountClient.deleteIntegration).toHaveBeenCalledTimes(2)
      expect(mockEvents.emit).toHaveBeenCalledWith(
        'integration:deleted',
        expect.objectContaining({
          integration: expect.any(Object),
          timestamp: expect.any(Number)
        })
      )
    })
  })
})
