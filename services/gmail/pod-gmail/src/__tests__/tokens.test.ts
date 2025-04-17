import { AccountUuid, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { AccountClient, IntegrationSecret } from '@hcengineering/account-client'
import { getAccountClient } from '@hcengineering/server-client'
import { TokenStorage } from '../tokens'
import { GMAIL_INTEGRATION, SecretType, Token } from '../types'

// Mock the getAccountClient function
jest.mock('@hcengineering/server-client', () => ({
  getAccountClient: jest.fn()
}))

describe('TokenStorage', () => {
  const mockSocialId = 'test-social-id' as PersonId
  const mockWorkspace = 'test-workspace' as WorkspaceUuid
  const mockPlatformToken = 'test-platform-token'
  const mockUserId = 'test-user' as AccountUuid
  const mockToken: Token = {
    userId: mockUserId,
    socialId: mockSocialId,
    workspace: mockWorkspace,
    token: 'test-token',
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    scope: 'test-scope',
    token_type: 'Bearer',
    expiry_date: 123456789
  }

  let tokenStorage: TokenStorage
  let mockAccountClient: jest.Mocked<AccountClient>

  beforeEach(() => {
    // Create mock AccountClient
    mockAccountClient = {
      getIntegrationSecret: jest.fn(),
      addIntegrationSecret: jest.fn(),
      updateIntegrationSecret: jest.fn(),
      deleteIntegrationSecret: jest.fn()
    } as any

    // Set up getAccountClient mock
    ;(getAccountClient as jest.Mock).mockReturnValue(mockAccountClient)

    // Create TokenStorage instance
    tokenStorage = new TokenStorage(mockWorkspace, mockPlatformToken)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getToken', () => {
    it('should return null when no token exists', async () => {
      mockAccountClient.getIntegrationSecret.mockResolvedValue(null)
      const result = await tokenStorage.getToken(mockSocialId)
      expect(result).toBeNull()
      expect(mockAccountClient.getIntegrationSecret).toHaveBeenCalledWith({
        key: SecretType.TOKEN,
        kind: GMAIL_INTEGRATION,
        socialId: mockSocialId,
        workspaceUuid: mockWorkspace
      })
    })

    it('should return parsed token when token exists', async () => {
      const mockSecret: IntegrationSecret = {
        socialId: mockSocialId,
        kind: GMAIL_INTEGRATION,
        workspaceUuid: mockWorkspace,
        key: SecretType.TOKEN,
        secret: JSON.stringify(mockToken)
      }
      mockAccountClient.getIntegrationSecret.mockResolvedValue(mockSecret)
      const result = await tokenStorage.getToken(mockSocialId)
      expect(result).toEqual(mockToken)
    })
  })

  describe('saveToken', () => {
    it('should update token when it exists', async () => {
      const mockSecret: IntegrationSecret = {
        socialId: mockSocialId,
        kind: GMAIL_INTEGRATION,
        workspaceUuid: mockWorkspace,
        key: SecretType.TOKEN,
        secret: 'existing'
      }
      mockAccountClient.getIntegrationSecret.mockResolvedValue(mockSecret)
      await tokenStorage.saveToken(mockToken)
      expect(mockAccountClient.updateIntegrationSecret).toHaveBeenCalledWith({
        key: SecretType.TOKEN,
        kind: GMAIL_INTEGRATION,
        socialId: mockSocialId,
        secret: JSON.stringify(mockToken),
        workspaceUuid: mockWorkspace
      })
      expect(mockAccountClient.addIntegrationSecret).not.toHaveBeenCalled()
    })

    it('should add new token when it does not exist', async () => {
      mockAccountClient.getIntegrationSecret.mockResolvedValue(null)
      await tokenStorage.saveToken(mockToken)
      expect(mockAccountClient.addIntegrationSecret).toHaveBeenCalledWith({
        key: SecretType.TOKEN,
        kind: GMAIL_INTEGRATION,
        socialId: mockSocialId,
        secret: JSON.stringify(mockToken),
        workspaceUuid: mockWorkspace
      })
      expect(mockAccountClient.updateIntegrationSecret).not.toHaveBeenCalled()
    })
  })

  describe('deleteToken', () => {
    it('should delete the token', async () => {
      await tokenStorage.deleteToken(mockSocialId)
      expect(mockAccountClient.deleteIntegrationSecret).toHaveBeenCalledWith({
        key: SecretType.TOKEN,
        kind: GMAIL_INTEGRATION,
        socialId: mockSocialId,
        workspaceUuid: mockWorkspace
      })
    })
  })
})
