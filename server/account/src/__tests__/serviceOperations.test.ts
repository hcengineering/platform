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

import { MeasureContext, PersonId, PersonUuid, SocialIdType, WorkspaceUuid } from '@hcengineering/core'
import platform, { PlatformError, Status, Severity } from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'

import { AccountDB, Integration, IntegrationKey, IntegrationSecret, IntegrationSecretKey } from '../types'
import * as utils from '../utils'
import {
  addIntegrationSecret,
  addSocialIdToPerson,
  createIntegration,
  deleteIntegration,
  deleteIntegrationSecret,
  getIntegration,
  getIntegrationSecret,
  listIntegrations,
  listIntegrationsSecrets,
  updateIntegration,
  updateIntegrationSecret
} from '../serviceOperations'

// Mock platform
jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    translate: jest.fn((id, params) => `${id} << ${JSON.stringify(params)}`)
  }
})

// Mock server-token
jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: jest.fn(),
  generateToken: jest.fn()
}))

describe('addSocialIdToPerson', () => {
  const mockCtx = {
    error: jest.fn()
  } as unknown as MeasureContext

  const mockDb = {} as unknown as AccountDB
  const mockBranding = null
  const mockToken = 'test-token'

  // Create spy only for this test suite
  const addSocialIdSpy = jest.spyOn(utils, 'addSocialId')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    // Restore the original implementation
    addSocialIdSpy.mockRestore()
  })

  test('should allow github service to add social id', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'github' }
    })
    const newSocialId = 'new-social-id' as PersonId
    addSocialIdSpy.mockResolvedValue(newSocialId)

    const params = {
      person: 'test-person' as PersonUuid,
      type: SocialIdType.GITHUB,
      value: 'test-value',
      confirmed: true
    }

    const result = await addSocialIdToPerson(mockCtx, mockDb, mockBranding, mockToken, params)

    expect(result).toBe(newSocialId)
    expect(addSocialIdSpy).toHaveBeenCalledWith(mockDb, params.person, params.type, params.value, params.confirmed)
  })

  test('should allow admin to add social id', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { admin: 'true' }
    })
    const newSocialId = 'new-social-id' as PersonId
    addSocialIdSpy.mockResolvedValue(newSocialId)

    const params = {
      person: 'test-person' as PersonUuid,
      type: SocialIdType.GITHUB,
      value: 'test-value',
      confirmed: false
    }

    const result = await addSocialIdToPerson(mockCtx, mockDb, mockBranding, mockToken, params)

    expect(result).toBe(newSocialId)
    expect(addSocialIdSpy).toHaveBeenCalledWith(mockDb, params.person, params.type, params.value, params.confirmed)
  })

  test('should throw error for unauthorized service', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'other-service' }
    })

    const params = {
      person: 'test-person' as PersonUuid,
      type: SocialIdType.GITHUB,
      value: 'test-value',
      confirmed: false
    }

    await expect(addSocialIdToPerson(mockCtx, mockDb, mockBranding, mockToken, params)).rejects.toThrow(
      new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    )

    expect(addSocialIdSpy).not.toHaveBeenCalled()
  })

  test('should throw error for regular user', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      account: 'test-account',
      workspace: 'test-workspace',
      extra: {}
    })

    const params = {
      person: 'test-person' as PersonUuid,
      type: SocialIdType.GITHUB,
      value: 'test-value',
      confirmed: false
    }

    await expect(addSocialIdToPerson(mockCtx, mockDb, mockBranding, mockToken, params)).rejects.toThrow(
      new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    )

    expect(addSocialIdSpy).not.toHaveBeenCalled()
  })
})

describe('integration methods', () => {
  const mockCtx = {
    error: jest.fn()
  } as unknown as MeasureContext

  const mockDb = {
    workspace: {
      findOne: jest.fn()
    },
    socialId: {
      findOne: jest.fn(),
      find: jest.fn()
    },
    integration: {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn()
    },
    integrationSecret: {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn()
    }
  } as unknown as AccountDB

  const mockBranding = null
  const mockToken = 'test-token'

  const integrationServices = ['github', 'telegram-bot', 'telegram', 'mailbox']

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createIntegration', () => {
    test('should allow allowed services to create integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockIntegration: Integration = {
        socialId: mockSocialId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)

      expect(mockDb.integration.insertOne).toHaveBeenCalledWith(mockIntegration)
    })

    test('should throw error when social id not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockIntegration: Integration = {
        socialId: 'nonexistent-social-id' as PersonId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      await expect(createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(
          new Status(Severity.ERROR, platform.status.SocialIdNotFound, { _id: 'nonexistent-social-id' })
        )
      )

      expect(mockDb.integration.insertOne).not.toHaveBeenCalled()
    })

    test('should throw error when workspace not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockIntegration: Integration = {
        socialId: mockSocialId,
        kind: 'test-kind',
        workspaceUuid: 'nonexistent-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)

      await expect(createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(
          new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: 'nonexistent-workspace' })
        )
      )

      expect(mockDb.integration.insertOne).not.toHaveBeenCalled()
    })

    test('should throw error when integration already exists', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockIntegration: Integration = {
        socialId: mockSocialId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(mockIntegration)

      await expect(createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationAlreadyExists, {}))
      )

      expect(mockDb.integration.insertOne).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      const mockIntegration: Integration = {
        socialId: 'test-social-id' as PersonId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      await expect(createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.insertOne).not.toHaveBeenCalled()
    })
  })

  describe('updateIntegration', () => {
    const mockIntegration: Integration = {
      socialId: 'test-social-id' as PersonId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      data: { someData: 'value' }
    }

    test('should allow allowed service to update integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        data: { oldData: 'old' }
      })

      await updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)

      expect(mockDb.integration.updateOne).toHaveBeenCalledWith(
        {
          socialId: mockIntegration.socialId,
          kind: mockIntegration.kind,
          workspaceUuid: mockIntegration.workspaceUuid
        },
        { data: mockIntegration.data }
      )
    })

    test('should throw error when integration not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)

      await expect(updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
      )

      expect(mockDb.integration.updateOne).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.updateOne).not.toHaveBeenCalled()
    })
  })

  describe('deleteIntegration', () => {
    const mockIntegrationKey: IntegrationKey = {
      socialId: 'test-social-id' as PersonId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid
    }

    test('should allow allowed service to delete integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({
        ...mockIntegrationKey,
        data: {}
      })

      await deleteIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegrationKey)

      expect(mockDb.integration.deleteMany).toHaveBeenCalledWith(mockIntegrationKey)
    })

    test('should throw error when integration not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)

      await expect(deleteIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegrationKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
      )

      expect(mockDb.integration.deleteMany).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(deleteIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegrationKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('getIntegration', () => {
    const mockKey: IntegrationKey = {
      socialId: 'test-social-id' as PersonId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid
    }

    test('should allow verified user to get their integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: 'test-account',
        extra: {}
      })

      const mockIntegration: Integration = {
        ...mockKey,
        data: {}
      }

      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([
        { _id: mockKey.socialId, personUuid: 'test-account', verifiedOn: 1 }
      ])
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(mockIntegration)

      const result = await getIntegration(mockCtx, mockDb, mockBranding, mockToken, mockKey)
      expect(result).toEqual(mockIntegration)
      expect(mockDb.integration.findOne).toHaveBeenCalledWith(mockKey)
    })

    test('should throw error when there is no matching verified social id', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: 'test-account',
        extra: {}
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      await expect(getIntegration(mockCtx, mockDb, mockBranding, mockToken, mockKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )
      expect(mockDb.integration.findOne).not.toHaveBeenCalled()
    })

    test('should allow all integration services to get integration', async () => {
      for (const service of integrationServices) {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          extra: { service }
        })

        const mockIntegration: Integration = {
          ...mockKey,
          data: {}
        }

        ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(mockIntegration)

        const result = await getIntegration(mockCtx, mockDb, mockBranding, mockToken, mockKey)
        expect(result).toEqual(mockIntegration)
      }
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      await expect(getIntegration(mockCtx, mockDb, mockBranding, mockToken, mockKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )
      expect(mockDb.integration.findOne).not.toHaveBeenCalled()
    })

    test('should return null when integration not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)

      const result = await getIntegration(mockCtx, mockDb, mockBranding, mockToken, mockKey)
      expect(result).toBeNull()
    })
  })

  describe('listIntegrations', () => {
    const mockSocialId = 'test-social-id' as PersonId
    const mockIntegration: Integration = {
      socialId: mockSocialId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      data: {}
    }

    test('should allow service to list all integrations without filters', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.find as jest.Mock).mockResolvedValue([mockIntegration])

      const result = await listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {})

      expect(result).toEqual([mockIntegration])
      expect(mockDb.integration.find).toHaveBeenCalledWith({ kind: undefined, workspaceUuid: undefined })
    })

    test('should allow service to list integrations with specific socialId', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.find as jest.Mock).mockResolvedValue([mockIntegration])

      const result = await listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {
        socialId: mockSocialId
      })

      expect(result).toEqual([mockIntegration])
      expect(mockDb.integration.find).toHaveBeenCalledWith({
        socialId: { $in: [mockSocialId] },
        kind: undefined,
        workspaceUuid: undefined
      })
    })

    test('should allow service to filter by kind and workspace', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.find as jest.Mock).mockResolvedValue([mockIntegration])

      const result = await listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid
      })

      expect(result).toEqual([mockIntegration])
      expect(mockDb.integration.find).toHaveBeenCalledWith({
        kind: 'test-kind',
        workspaceUuid: 'test-workspace'
      })
    })

    test('should allow service to filter by null workspace', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.find as jest.Mock).mockResolvedValue([mockIntegration])

      const result = await listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {
        workspaceUuid: null
      })

      expect(result).toEqual([mockIntegration])
      expect(mockDb.integration.find).toHaveBeenCalledWith({
        kind: undefined,
        workspaceUuid: null
      })
    })

    test('should allow regular user to list their verified integrations', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: 'test-account',
        extra: {}
      })

      const verifiedSocialIds = [
        { _id: mockSocialId, personUuid: 'test-account', verifiedOn: 1 },
        { _id: 'another-social-id' as PersonId, personUuid: 'test-account', verifiedOn: 1 }
      ]
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue(verifiedSocialIds)
      ;(mockDb.integration.find as jest.Mock).mockResolvedValue([mockIntegration])

      const result = await listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {})

      expect(result).toEqual([mockIntegration])
      expect(mockDb.integration.find).toHaveBeenCalledWith({
        socialId: { $in: verifiedSocialIds.map((s) => s._id) },
        kind: undefined,
        workspaceUuid: undefined
      })
    })

    test('should allow user to filter their integrations by specific socialId', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: 'test-account',
        extra: {}
      })

      const verifiedSocialIds = [{ _id: mockSocialId, personUuid: 'test-account', verifiedOn: 1 }]
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue(verifiedSocialIds)
      ;(mockDb.integration.find as jest.Mock).mockResolvedValue([mockIntegration])

      const result = await listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {
        socialId: mockSocialId
      })

      expect(result).toEqual([mockIntegration])
      expect(mockDb.integration.find).toHaveBeenCalledWith({
        socialId: { $in: [mockSocialId] },
        kind: undefined,
        workspaceUuid: undefined
      })
    })

    test('should throw error when user has no verified social ids', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: 'test-account',
        extra: {}
      })
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([])

      await expect(listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {})).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.find).not.toHaveBeenCalled()
    })

    test('should throw error when user requests unauthorized socialId', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: 'test-account',
        extra: {}
      })

      const verifiedSocialIds = [{ _id: 'other-social-id' as PersonId, personUuid: 'test-account', verifiedOn: 1 }]
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue(verifiedSocialIds)

      await expect(
        listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {
          socialId: mockSocialId // Not in user's verified social ids
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))

      expect(mockDb.integration.find).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([])

      await expect(listIntegrations(mockCtx, mockDb, mockBranding, mockToken, {})).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.find).not.toHaveBeenCalled()
    })
  })

  describe('addIntegrationSecret', () => {
    test('should allow allowed services to create integration secret', async () => {
      for (const service of integrationServices) {
        jest.clearAllMocks()
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          extra: { service }
        })

        const mockSecret: IntegrationSecret = {
          socialId: 'test-social-id' as PersonId,
          kind: 'test-kind',
          workspaceUuid: 'test-workspace' as WorkspaceUuid,
          key: 'test-key',
          secret: 'test-secret'
        }

        const mockIntegration: Integration = {
          socialId: mockSecret.socialId,
          kind: mockSecret.kind,
          workspaceUuid: mockSecret.workspaceUuid,
          data: {}
        }

        ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(mockIntegration)
        ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)

        await addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)

        expect(mockDb.integrationSecret.insertOne).toHaveBeenCalledWith(mockSecret)
      }
    })

    test('should throw error when integration does not exist', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSecret: IntegrationSecret = {
        socialId: 'test-social-id' as PersonId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        key: 'test-key',
        secret: 'test-secret'
      }

      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)

      await expect(addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
      )

      expect(mockDb.integrationSecret.insertOne).not.toHaveBeenCalled()
    })

    test('should throw error if secret already exists', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSecret: IntegrationSecret = {
        socialId: 'test-social-id' as PersonId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        key: 'test-key',
        secret: 'test-secret'
      }

      const mockIntegration: Integration = {
        socialId: mockSecret.socialId,
        kind: mockSecret.kind,
        workspaceUuid: mockSecret.workspaceUuid,
        data: {}
      }

      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(mockIntegration)
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(mockSecret)

      await expect(addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretAlreadyExists, {}))
      )

      expect(mockDb.integrationSecret.insertOne).not.toHaveBeenCalled()
    })

    test('should throw for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      const mockSecret: IntegrationSecret = {
        socialId: 'test-social-id' as PersonId,
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        key: 'test-key',
        secret: 'test-secret'
      }

      await expect(addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.insertOne).not.toHaveBeenCalled()
    })
  })

  describe('updateIntegrationSecret', () => {
    const mockSecret: IntegrationSecret = {
      socialId: 'test-social-id' as PersonId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      key: 'test-key',
      secret: 'new-secret'
    }

    const mockSecretKey: IntegrationSecretKey = {
      socialId: mockSecret.socialId,
      kind: mockSecret.kind,
      workspaceUuid: mockSecret.workspaceUuid,
      key: mockSecret.key
    }

    test('should allow allowed service to update secret', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue({
        ...mockSecret,
        secret: 'old-secret'
      })

      await updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)

      expect(mockDb.integrationSecret.updateOne).toHaveBeenCalledWith(mockSecretKey, { secret: mockSecret.secret })
    })

    test('should throw error when secret not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)

      await expect(updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
      )

      expect(mockDb.integrationSecret.updateOne).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.findOne).not.toHaveBeenCalled()
      expect(mockDb.integrationSecret.updateOne).not.toHaveBeenCalled()
    })
  })

  describe('deleteIntegrationSecret', () => {
    const mockSecretKey: IntegrationSecretKey = {
      socialId: 'test-social-id' as PersonId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      key: 'test-key'
    }

    test('should allow allowed service to delete secret', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue({
        ...mockSecretKey,
        secret: 'test-secret'
      })

      await deleteIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)

      expect(mockDb.integrationSecret.deleteMany).toHaveBeenCalledWith(mockSecretKey)
    })

    test('should throw error when secret not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)

      await expect(deleteIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
      )

      expect(mockDb.integrationSecret.deleteMany).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(deleteIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('getIntegrationSecret', () => {
    const mockSecretKey: IntegrationSecretKey = {
      socialId: 'test-social-id' as PersonId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      key: 'test-key'
    }

    const mockSecret: IntegrationSecret = {
      ...mockSecretKey,
      secret: 'test-secret'
    }

    test('should allow allowed service to get secret', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(mockSecret)

      const result = await getIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)

      expect(result).toEqual(mockSecret)
      expect(mockDb.integrationSecret.findOne).toHaveBeenCalledWith(mockSecretKey)
    })

    test('should throw error when secret not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)

      await expect(getIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
      )
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(getIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.findOne).not.toHaveBeenCalled()
    })
  })

  describe('listIntegrationsSecrets', () => {
    const mockSocialId = 'test-social-id' as PersonId
    const mockSecret: IntegrationSecret = {
      socialId: mockSocialId,
      kind: 'test-kind',
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      key: 'test-key',
      secret: 'test-secret'
    }

    test('should allow service to list all secrets without filters', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.find as jest.Mock).mockResolvedValue([mockSecret])

      const result = await listIntegrationsSecrets(mockCtx, mockDb, mockBranding, mockToken, {})

      expect(result).toEqual([mockSecret])
      expect(mockDb.integrationSecret.find).toHaveBeenCalledWith({
        socialId: undefined,
        kind: undefined,
        workspaceUuid: undefined
      })
    })

    test('should allow service to filter by socialId', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.find as jest.Mock).mockResolvedValue([mockSecret])

      const result = await listIntegrationsSecrets(mockCtx, mockDb, mockBranding, mockToken, {
        socialId: mockSocialId
      })

      expect(result).toEqual([mockSecret])
      expect(mockDb.integrationSecret.find).toHaveBeenCalledWith({
        socialId: mockSocialId,
        kind: undefined,
        workspaceUuid: undefined
      })
    })

    test('should allow service to filter by kind and workspace', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.find as jest.Mock).mockResolvedValue([mockSecret])

      const result = await listIntegrationsSecrets(mockCtx, mockDb, mockBranding, mockToken, {
        kind: 'test-kind',
        workspaceUuid: 'test-workspace' as WorkspaceUuid
      })

      expect(result).toEqual([mockSecret])
      expect(mockDb.integrationSecret.find).toHaveBeenCalledWith({
        kind: 'test-kind',
        workspaceUuid: 'test-workspace',
        socialId: undefined
      })
    })

    test('should allow service to filter by null workspace', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.find as jest.Mock).mockResolvedValue([mockSecret])

      const result = await listIntegrationsSecrets(mockCtx, mockDb, mockBranding, mockToken, {
        workspaceUuid: null
      })

      expect(result).toEqual([mockSecret])
      expect(mockDb.integrationSecret.find).toHaveBeenCalledWith({
        kind: undefined,
        workspaceUuid: null,
        socialId: undefined
      })
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(listIntegrationsSecrets(mockCtx, mockDb, mockBranding, mockToken, {})).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.find).not.toHaveBeenCalled()
    })
  })
})
