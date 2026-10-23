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

import {
  type AccountUuid,
  type IntegrationKind,
  type MeasureContext,
  type PersonId,
  type PersonUuid,
  SocialIdType,
  type WorkspaceUuid
} from '@hcengineering/core'
import platform, { PlatformError, Status, Severity } from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'

import {
  type AccountDB,
  type Integration,
  type IntegrationKey,
  type IntegrationSecret,
  type IntegrationSecretKey,
  SubscriptionStatus,
  SubscriptionType
} from '../types'
import * as utils from '../utils'
import {
  addSocialIdToPerson,
  createIntegration,
  deleteIntegration,
  deleteIntegrationSecret,
  findPersonBySocialKey,
  getIntegration,
  getIntegrationSecret,
  listIntegrations,
  listIntegrationsSecrets,
  updateIntegration,
  updateIntegrationSecret,
  addIntegrationSecret,
  upsertSubscription
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
  const addSocialIdSpy = jest.spyOn(utils, 'addSocialIdBase')

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
      confirmed: true,
      displayValue: 'test-display-value'
    }

    const result = await addSocialIdToPerson(mockCtx, mockDb, mockBranding, mockToken, params)

    expect(result).toBe(newSocialId)
    expect(addSocialIdSpy).toHaveBeenCalledWith(
      mockDb,
      params.person,
      params.type,
      params.value,
      params.confirmed,
      params.displayValue
    )
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
      confirmed: false,
      displayValue: 'test-display-value'
    }

    const result = await addSocialIdToPerson(mockCtx, mockDb, mockBranding, mockToken, params)

    expect(result).toBe(newSocialId)
    expect(addSocialIdSpy).toHaveBeenCalledWith(
      mockDb,
      params.person,
      params.type,
      params.value,
      params.confirmed,
      params.displayValue
    )
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
      update: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn()
    },
    integrationSecret: {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn()
    }
  } as unknown as AccountDB

  const mockBranding = null
  const mockToken = 'test-token'

  const integrationServices = ['github', 'telegram-bot', 'hulygram', 'mailbox']

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
        kind: 'test-kind' as IntegrationKind,
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
      expect(mockDb.integration.insertOne).toHaveBeenCalledWith(mockIntegration)
    })

    test('should allow verified user to create their integration', async () => {
      const mockAccount = 'test-account'
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockIntegration: Integration = {
        socialId: mockSocialId,
        kind: 'test-kind' as IntegrationKind,
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
      expect(mockDb.integration.insertOne).toHaveBeenCalledWith(mockIntegration)
    })

    test('should throw error when user creates integration for different social id', async () => {
      const mockAccount = 'test-account'
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockIntegration: Integration = {
        socialId: mockSocialId,
        kind: 'test-kind' as IntegrationKind,
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        data: {}
      }

      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await expect(createIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
      expect(mockDb.integration.insertOne).not.toHaveBeenCalled()
    })

    test('should throw error when social id not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockIntegration: Integration = {
        socialId: 'nonexistent-social-id' as PersonId,
        kind: 'test-kind' as IntegrationKind,
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
        kind: 'test-kind' as IntegrationKind,
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
        kind: 'test-kind' as IntegrationKind,
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
        kind: 'test-kind' as IntegrationKind,
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
    const mockAccount = 'test-account'
    const mockSocialId = 'test-social-id' as PersonId
    const mockIntegration: Integration = {
      socialId: mockSocialId,
      kind: 'test-kind' as IntegrationKind,
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
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)

      expect(mockDb.integration.update).toHaveBeenCalledWith(
        {
          socialId: mockIntegration.socialId,
          kind: mockIntegration.kind,
          workspaceUuid: mockIntegration.workspaceUuid
        },
        { data: mockIntegration.data }
      )

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
    })

    test('should allow verified user to update their integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        data: { oldData: 'old' }
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)

      expect(mockDb.integration.update).toHaveBeenCalledWith(
        {
          socialId: mockIntegration.socialId,
          kind: mockIntegration.kind,
          workspaceUuid: mockIntegration.workspaceUuid
        },
        { data: mockIntegration.data }
      )

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when use updates integration for different social id', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({
        ...mockIntegration,
        data: { oldData: 'old' }
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      await expect(updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.update).not.toHaveBeenCalled()

      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when integration not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })

      await expect(updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
      )

      expect(mockDb.integration.update).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(updateIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegration)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteIntegration', () => {
    const mockAccount = 'test-account'
    const mockSocialId = 'test-social-id' as PersonId
    const mockIntegrationKey: IntegrationKey = {
      socialId: mockSocialId,
      kind: 'test-kind' as IntegrationKind,
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
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await deleteIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegrationKey)

      expect(mockDb.integration.deleteMany).toHaveBeenCalledWith(mockIntegrationKey)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
    })

    test('should allow verified user to delete their integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({
        ...mockIntegrationKey,
        data: {}
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await deleteIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegrationKey)

      expect(mockDb.integration.deleteMany).toHaveBeenCalledWith(mockIntegrationKey)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when user deletes integration for different social id', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({
        ...mockIntegrationKey,
        data: {}
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await expect(deleteIntegration(mockCtx, mockDb, mockBranding, mockToken, mockIntegrationKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integration.deleteMany).not.toHaveBeenCalled()
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when integration not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })

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
    const mockAccount = 'test-account'
    const mockSocialId = 'test-social-id' as PersonId
    const mockKey: IntegrationKey = {
      socialId: mockSocialId,
      kind: 'test-kind' as IntegrationKind,
      workspaceUuid: 'test-workspace' as WorkspaceUuid
    }

    test('should allow verified user to get their integration', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount,
        extra: {}
      })

      const mockIntegration: Integration = {
        ...mockKey,
        data: {}
      }

      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([
        { _id: mockKey.socialId, personUuid: mockAccount, verifiedOn: 1 }
      ])
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(mockIntegration)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })

      const result = await getIntegration(mockCtx, mockDb, mockBranding, mockToken, mockKey)
      expect(result).toEqual(mockIntegration)
      expect(mockDb.integration.findOne).toHaveBeenCalledWith(mockKey)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
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
      kind: 'test-kind' as IntegrationKind,
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
        kind: 'test-kind' as IntegrationKind,
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

        const mockSocialId = 'test-social-id' as PersonId
        const mockSecret: IntegrationSecret = {
          socialId: mockSocialId,
          kind: 'test-kind' as IntegrationKind,
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
        ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

        await addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)

        expect(mockDb.integrationSecret.insertOne).toHaveBeenCalledWith(mockSecret)
        expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
      }
    })

    test('should allow verified user services to create their integration secret', async () => {
      jest.clearAllMocks()
      const mockAccount = 'test-account'
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockSecret: IntegrationSecret = {
        socialId: mockSocialId,
        kind: 'test-kind' as IntegrationKind,
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
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)

      expect(mockDb.integrationSecret.insertOne).toHaveBeenCalledWith(mockSecret)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when user services adds integration secret for different social id', async () => {
      jest.clearAllMocks()
      const mockAccount = 'test-account'
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockSecret: IntegrationSecret = {
        socialId: mockSocialId,
        kind: 'test-kind' as IntegrationKind,
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
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)

      await expect(addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.insertOne).not.toHaveBeenCalled()
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when integration does not exist', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSocialId = 'test-social-id' as PersonId
      const mockSecret: IntegrationSecret = {
        socialId: mockSocialId,
        kind: 'test-kind' as IntegrationKind,
        workspaceUuid: 'test-workspace' as WorkspaceUuid,
        key: 'test-key',
        secret: 'test-secret'
      }

      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await expect(addIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationNotFound, {}))
      )

      expect(mockDb.integrationSecret.insertOne).not.toHaveBeenCalled()
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
    })

    test('should throw error if secret already exists', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const mockSecret: IntegrationSecret = {
        socialId: 'test-social-id' as PersonId,
        kind: 'test-kind' as IntegrationKind,
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
        kind: 'test-kind' as IntegrationKind,
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
    const mockAccount = 'test-account'
    const mockSocialId = 'test-social-id' as PersonId
    const mockSecret: IntegrationSecret = {
      socialId: mockSocialId,
      kind: 'test-kind' as IntegrationKind,
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
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({})

      await updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)

      expect(mockDb.integrationSecret.update).toHaveBeenCalledWith(mockSecretKey, { secret: mockSecret.secret })
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
    })

    test('should allow verified user to update their secret', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue({
        ...mockSecret,
        secret: 'old-secret'
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({})

      await updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)

      expect(mockDb.integrationSecret.update).toHaveBeenCalledWith(mockSecretKey, { secret: mockSecret.secret })
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when user updates secret for different social id', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue({
        ...mockSecret,
        secret: 'old-secret'
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })

      await expect(updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.update).not.toHaveBeenCalledWith()
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when secret not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })

      await expect(updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.IntegrationSecretNotFound, {}))
      )

      expect(mockDb.integrationSecret.update).not.toHaveBeenCalled()
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized-service' }
      })

      await expect(updateIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecret)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.findOne).not.toHaveBeenCalled()
      expect(mockDb.integrationSecret.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteIntegrationSecret', () => {
    const mockAccount = 'test-account'
    const mockSocialId = 'test-social-id' as PersonId
    const mockSecretKey: IntegrationSecretKey = {
      socialId: mockSocialId,
      kind: 'test-kind' as IntegrationKind,
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
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({})

      await deleteIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)

      expect(mockDb.integrationSecret.deleteMany).toHaveBeenCalledWith(mockSecretKey)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({ _id: mockSocialId, verifiedOn: { $gt: 0 } })
    })

    test('should allow verified user to delete their secret', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue({
        ...mockSecretKey,
        secret: 'test-secret'
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({})

      await deleteIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)

      expect(mockDb.integrationSecret.deleteMany).toHaveBeenCalledWith(mockSecretKey)
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when user deletes secret for different social id', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue({
        ...mockSecretKey,
        secret: 'test-secret'
      })
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue({ uuid: 'test-workspace' })
      ;(mockDb.integration.findOne as jest.Mock).mockResolvedValue({})

      await expect(deleteIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(mockDb.integrationSecret.deleteMany).not.toHaveBeenCalledWith()
      expect(mockDb.socialId.findOne).toHaveBeenCalledWith({
        _id: mockSocialId,
        personUuid: mockAccount,
        verifiedOn: { $gt: 0 }
      })
    })

    test('should throw error when secret not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })

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
    const mockSocialId = 'test-social-id' as PersonId
    const mockSecretKey: IntegrationSecretKey = {
      socialId: mockSocialId,
      kind: 'test-kind' as IntegrationKind,
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

    test('should return null when integration secret not found', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })
      ;(mockDb.integrationSecret.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ _id: mockSocialId })

      const result = await getIntegrationSecret(mockCtx, mockDb, mockBranding, mockToken, mockSecretKey)
      expect(result).toBeNull()
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
      kind: 'test-kind' as IntegrationKind,
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
        kind: 'test-kind' as IntegrationKind,
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

describe('upsertSubscription', () => {
  const mockCtx = {
    error: jest.fn(),
    info: jest.fn()
  } as unknown as MeasureContext

  const mockBranding = null
  const mockToken = 'test-token'

  let mockDb: any
  let getWorkspaceByIdSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()

    mockDb = {
      subscription: {
        findOne: jest.fn(),
        insertOne: jest.fn(),
        update: jest.fn()
      }
    }

    // Mock getWorkspaceById utility function
    getWorkspaceByIdSpy = jest.spyOn(utils, 'getWorkspaceById')
  })

  afterAll(() => {
    getWorkspaceByIdSpy.mockRestore()
  })

  test('should create new subscription', async () => {
    const workspaceUuid = 'test-workspace' as WorkspaceUuid
    const accountUuid = 'test-account' as AccountUuid

    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'payment' }
    })

    getWorkspaceByIdSpy.mockResolvedValue({ uuid: workspaceUuid })
    mockDb.subscription.findOne.mockResolvedValue(null)

    const subscriptionData = {
      id: 'sub-123',
      workspaceUuid,
      accountUuid,
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123',
      providerCheckoutId: 'checkout-456',
      type: SubscriptionType.Tier,
      status: SubscriptionStatus.Active,
      plan: 'pro'
    }

    await upsertSubscription(mockCtx, mockDb, mockBranding, mockToken, subscriptionData)

    expect(getWorkspaceByIdSpy).toHaveBeenCalledWith(mockDb, workspaceUuid)
    expect(mockDb.subscription.findOne).toHaveBeenCalledWith({
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123'
    })
    expect(mockDb.subscription.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-123',
        workspaceUuid,
        accountUuid,
        provider: 'polar',
        providerSubscriptionId: 'polar-sub-123',
        status: 'active',
        plan: 'pro'
      })
    )
  })

  test('should update existing subscription', async () => {
    const workspaceUuid = 'test-workspace' as WorkspaceUuid
    const accountUuid = 'test-account' as AccountUuid

    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'payment' }
    })

    const existingSubscription = {
      id: 'existing-sub-id',
      workspaceUuid,
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123'
    }

    getWorkspaceByIdSpy.mockResolvedValue({ uuid: workspaceUuid })
    mockDb.subscription.findOne.mockResolvedValue(existingSubscription)

    const subscriptionData = {
      id: 'sub-123',
      workspaceUuid,
      accountUuid,
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123',
      type: SubscriptionType.Tier,
      status: SubscriptionStatus.Canceled,
      plan: 'pro',
      canceledAt: Date.now()
    }

    await upsertSubscription(mockCtx, mockDb, mockBranding, mockToken, subscriptionData)

    expect(mockDb.subscription.update).toHaveBeenCalledWith(
      { id: 'existing-sub-id' },
      expect.objectContaining({
        status: 'canceled',
        canceledAt: subscriptionData.canceledAt
      })
    )
    expect(mockDb.subscription.insertOne).not.toHaveBeenCalled()
  })

  test('should reject non-billing service', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'other-service' }
    })

    const subscriptionData = {
      workspaceUuid: 'test-workspace' as WorkspaceUuid,
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123'
    } as any

    await expect(upsertSubscription(mockCtx, mockDb, mockBranding, mockToken, subscriptionData)).rejects.toThrow(
      new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    )

    expect(mockDb.subscription.findOne).not.toHaveBeenCalled()
  })

  test('should reject if workspace not found', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'billing' }
    })

    getWorkspaceByIdSpy.mockResolvedValue(null)

    const subscriptionData = {
      workspaceUuid: 'nonexistent-workspace' as WorkspaceUuid,
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123'
    } as any

    await expect(upsertSubscription(mockCtx, mockDb, mockBranding, mockToken, subscriptionData)).rejects.toThrow(
      PlatformError
    )

    expect(mockDb.subscription.findOne).not.toHaveBeenCalled()
  })

  test('should handle subscription with optional fields', async () => {
    const workspaceUuid = 'test-workspace' as WorkspaceUuid
    const accountUuid = 'test-account' as AccountUuid

    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'payment' }
    })

    getWorkspaceByIdSpy.mockResolvedValue({ uuid: workspaceUuid })
    mockDb.subscription.findOne.mockResolvedValue(null)

    const subscriptionData = {
      id: 'sub-123',
      workspaceUuid,
      accountUuid,
      provider: 'polar',
      providerSubscriptionId: 'polar-sub-123',
      providerCheckoutId: 'checkout-456',
      type: SubscriptionType.Tier,
      status: SubscriptionStatus.Trialing,
      plan: 'storage-100gb',
      periodStart: Date.now(),
      periodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      trialEnd: Date.now() + 7 * 24 * 60 * 60 * 1000,
      providerData: {
        customerExternalId: 'cus_123',
        metadata: { source: 'website' }
      }
    }

    await upsertSubscription(mockCtx, mockDb, mockBranding, mockToken, subscriptionData)

    expect(mockDb.subscription.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCheckoutId: 'checkout-456',
        trialEnd: subscriptionData.trialEnd,
        providerData: subscriptionData.providerData
      })
    )
  })
})

describe('findPersonBySocialKey', () => {
  const mockCtx = {
    warn: jest.fn(),
    error: jest.fn()
  } as unknown as MeasureContext
  const mockBranding = null
  const mockToken = 'test-token'
  const callerAccount = 'caller-account' as AccountUuid
  const callerWorkspace = 'ws-1' as WorkspaceUuid
  const otherWorkspace = 'ws-2' as WorkspaceUuid

  function makeMockDb (options: {
    socialId?: { personUuid: string } | null
    targetAccountUuid?: string | null
    callerWorkspaces?: WorkspaceUuid[]
    targetWorkspaces?: WorkspaceUuid[]
  }): AccountDB {
    const socialId = options.socialId ?? null
    const targetAccountUuid = options.targetAccountUuid ?? null
    const callerWorkspaces = options.callerWorkspaces ?? []
    const targetWorkspaces = options.targetWorkspaces ?? []

    const allWorkspaces: Record<string, WorkspaceUuid[]> = {
      [callerAccount]: callerWorkspaces,
      ...(targetAccountUuid != null ? { [targetAccountUuid]: targetWorkspaces } : {})
    }

    const accountFindOne = jest.fn().mockImplementation(async (query: { uuid: AccountUuid }) => {
      if (query.uuid === targetAccountUuid) {
        return { uuid: targetAccountUuid }
      }
      return null
    })

    const getAccountWorkspaces = jest.fn().mockImplementation(async (accountId: AccountUuid) => {
      const ws = allWorkspaces[accountId] ?? []
      return ws.map((uuid) => ({
        uuid,
        status: { mode: 'active' as any },
        name: 'ws',
        url: 'ws',
        branding: null,
        location: 'local',
        region: 'local',
        createdBy: callerAccount,
        createdOn: 0,
        billingAccount: null
      } as any))
    })

    return {
      socialId: {
        findOne: jest.fn().mockResolvedValue(socialId)
      },
      account: {
        findOne: accountFindOne
      },
      getAccountWorkspaces
    } as unknown as AccountDB
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('still rejects empty socialString', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({})

    await expect(
      findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, { socialString: '' })
    ).rejects.toThrow(/BadRequest/)
  })

  test('returns undefined when social key is not found', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({ socialId: null })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:missing@example.com'
    })

    expect(result).toBeUndefined()
  })

  test('service token can look up any social key without a workspace check', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { service: 'tool' }
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [],
      targetWorkspaces: []
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBe('looked-up-account')
    expect(mockDb.getAccountWorkspaces).not.toHaveBeenCalled()
  })

  test('admin token can look up any social key without a workspace check', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { admin: 'true' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account'
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBe('looked-up-account')
    expect(mockDb.getAccountWorkspaces).not.toHaveBeenCalled()
  })

  test('user token returns the person when caller and target share an active workspace', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [callerWorkspace],
      targetWorkspaces: [callerWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBe('looked-up-account')
    expect(mockDb.getAccountWorkspaces).toHaveBeenCalledWith(callerAccount)
    expect(mockDb.getAccountWorkspaces).toHaveBeenCalledWith('looked-up-account')
  })

  test('user token returns undefined when caller and target share no active workspace', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [callerWorkspace],
      targetWorkspaces: [otherWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBeUndefined()
  })

  test('user token returns undefined when caller has no active workspaces', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [],
      targetWorkspaces: [callerWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBeUndefined()
  })

  test('user token returns undefined when the target person has no account', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'orphan-person' },
      targetAccountUuid: null,
      callerWorkspaces: [callerWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBeUndefined()
    expect(mockDb.getAccountWorkspaces).not.toHaveBeenCalled()
  })

  test('user token with requireAccount=true returns the account uuid when shared workspace exists', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [callerWorkspace],
      targetWorkspaces: [callerWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com',
      requireAccount: true
    })

    expect(result).toBe('looked-up-account')
  })

  test('user token with requireAccount=true returns undefined when no shared workspace', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [callerWorkspace],
      targetWorkspaces: [otherWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com',
      requireAccount: true
    })

    expect(result).toBeUndefined()
  })

  test('user token throws Forbidden when the token has no account claim', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' }
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' }
    })

    await expect(
      findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
        socialString: 'email:alice@example.com'
      })
    ).rejects.toThrow(/Forbidden/)
  })

  test('user token does not leak the existence of a non-shared person (no diff vs missing key)', async () => {
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      extra: { authMethod: 'password' },
      account: callerAccount
    })
    const mockDb = makeMockDb({
      socialId: { personUuid: 'looked-up-account' },
      targetAccountUuid: 'looked-up-account',
      callerWorkspaces: [callerWorkspace],
      targetWorkspaces: [otherWorkspace]
    })

    const result = await findPersonBySocialKey(mockCtx, mockDb, mockBranding, mockToken, {
      socialString: 'email:alice@example.com'
    })

    expect(result).toBeUndefined()
  })
})
