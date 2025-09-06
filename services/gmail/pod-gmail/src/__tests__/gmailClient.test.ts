import {
  AccountUuid,
  PersonId,
  WorkspaceUuid,
  type SocialId,
  type SocialIdType,
  type MeasureContext
} from '@hcengineering/core'

import { GmailClient } from '../gmail'
import { ProjectCredentials, ProjectCredentialsData, Token, User } from '../types'
import { TokenStorage } from '../tokens'
import { SyncManager } from '../message/sync'

// Mock dependencies
const mockedGoogleAuth = {
  generateAuthUrl: jest.fn().mockReturnValue('https://auth-url.com'),
  getToken: jest.fn().mockResolvedValue({ tokens: { access_token: 'new-token' } }),
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn().mockResolvedValue({ credentials: { access_token: 'refreshed-token' } }),
  revokeCredentials: jest.fn().mockResolvedValue({})
}

const mockedGmailUsers = {
  getProfile: jest.fn().mockResolvedValue({ data: { emailAddress: 'test@example.com' } }),
  messages: {
    send: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({ data: { messages: [] } })
  },
  watch: jest.fn().mockResolvedValue({}),
  stop: jest.fn().mockResolvedValue({})
}

// Mock all imports before they're used
jest.mock('@hcengineering/core', () => {
  return {
    AccountUuid: String,
    PersonId: String,
    WorkspaceUuid: String,
    // Provide missing properties
    configUserAccountUuid: 'test-user-id',
    systemAccountUuid: 'system-user-id',
    core: {
      space: {
        Workspace: 'workspace'
      }
    },
    // Add toFindResult function to fix the import error
    toFindResult: jest.fn().mockImplementation((items: any[]) => ({
      items,
      total: items.length
    })),
    // Add withContext decorator mock
    withContext: jest.fn().mockImplementation((name: string) => {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        return descriptor
      }
    }),
    TxOperations: jest.fn().mockImplementation(() => ({
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(undefined),
      createDoc: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      updateDoc: jest.fn().mockResolvedValue({}),
      tx: jest.fn().mockResolvedValue({})
    })),
    SocialIdType: {
      Email: 'email'
    }
  }
})

jest.mock('@hcengineering/mail-common', () => ({
  createMessages: jest.fn().mockResolvedValue(undefined),
  getChannel: jest.fn().mockResolvedValue({ _id: 'test-channel-id' }),
  isSyncedMessage: jest.fn().mockReturnValue(false),
  getMessageExtra: jest.fn().mockReturnValue({}),
  getMailHeaders: jest.fn().mockReturnValue([]),
  isHulyMessage: jest.fn().mockReturnValue(false)
}))

jest.mock('googleapis', () => ({
  gmail_v1: {},
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => mockedGoogleAuth)
    },
    gmail: jest.fn().mockImplementation(() => ({
      users: mockedGmailUsers
    }))
  }
}))

jest.mock('../tokens')
jest.mock('../message/adapter')
jest.mock('../message/sync')
jest.mock('../message/attachments')
jest.mock('@hcengineering/server-core', () => ({
  withContext: jest.fn().mockImplementation((name: string) => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      return descriptor
    }
  })
}))
jest.mock('../accounts', () => ({
  getOrCreateSocialId: jest.fn().mockResolvedValue({ _id: 'test-social-id' })
}))
jest.mock('../gmail/utils', () => ({
  getEmail: jest.fn().mockResolvedValue('test@example.com')
}))
jest.mock('../integrations', () => ({
  createIntegrationIfNotExists: jest.fn().mockResolvedValue({ _id: 'test-integration-id' }),
  disableIntegration: jest.fn(),
  removeIntegration: jest.fn()
}))
jest.mock('../utils', () => ({
  addFooter: jest.fn().mockImplementation((content: string) => content),
  isToken: jest.fn().mockImplementation((obj: any) => 'token' in obj),
  serviceToken: jest.fn().mockReturnValue('service-token'),
  getKvsClient: jest.fn().mockImplementation(() => ({
    getValue: jest.fn(),
    setValue: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
    deleteKey: jest.fn().mockImplementation(() => Promise.resolve(undefined)),
    listKeys: jest.fn()
  })),
  getSpaceId: jest.fn().mockReturnValue('test-space-id')
}))

// Mock gmail module
jest.mock('@hcengineering/gmail', () => ({
  integrationType: {
    Gmail: 'gmail'
  },
  class: {
    NewMessage: 'class.NewMessage'
  }
}))

// Mock setting module
jest.mock('@hcengineering/setting', () => ({
  class: {
    Integration: 'class.Integration'
  }
}))

// Mock config
jest.mock('../config', () => ({
  WATCH_TOPIC_NAME: 'test-topic'
}))

jest.mock('@hcengineering/account-client', () => ({
  getClient: jest.fn().mockImplementation(() => ({
    getLoginInfoByToken: jest.fn().mockResolvedValue({
      endpoint: 'wss://test-endpoint.com',
      workspace: 'mockWorkspaceId',
      token: 'test-token'
    }),
    getPersonInfo: jest.fn().mockResolvedValue({
      socialIds: [
        {
          _id: 'test-social-id',
          value: 'test@example.com',
          type: 'email'
        }
      ]
    })
  })),
  isWorkspaceLoginInfo: jest.fn().mockImplementation(() => true)
}))

describe('GmailClient', () => {
  const mockContext: MeasureContext = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    measure: jest.fn().mockImplementation((name: string, fn: () => any) => fn()),
    with: jest.fn().mockImplementation((data: any, fn: () => any) => fn())
  } as any

  const mockWorkspaceId = 'test-workspace' as WorkspaceUuid
  const mockUserId = 'test-user-id' as AccountUuid

  // Fix the SocialId type issue
  const mockSocialId: SocialId = {
    _id: 'test-social-id' as PersonId,
    value: 'test@example.com',
    type: 'email' as SocialIdType,
    key: 'email'
  }

  const credentialsData: ProjectCredentialsData = {
    client_id: 'client-id',
    client_secret: 'client-secret',
    redirect_uris: ['https://redirect-uri.com'],
    project_id: 'test-project',
    auth_uri: 'https://auth-uri.com',
    token_uri: 'https://token-uri.com',
    auth_provider_x509_cert_url: 'https://cert-url.com'
  }
  const mockCredentials: ProjectCredentials = {
    web: credentialsData
  }

  const mockUser: User = {
    userId: mockUserId,
    workspace: mockWorkspaceId,
    socialId: mockSocialId,
    email: 'test@example.com',
    token: 'user-token'
  }

  const mockToken: Token = {
    userId: mockUserId,
    workspace: mockWorkspaceId,
    socialId: mockSocialId,
    token: 'test-token',
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    scope: 'test-scope',
    token_type: 'Bearer',
    expiry_date: 123456789
  }

  const mockClient = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(undefined),
    createDoc: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue({}),
    updateDoc: jest.fn().mockResolvedValue({}),
    tx: jest.fn().mockResolvedValue({})
  }

  const mockWorkspaceClient = {
    subscribeMessages: jest.fn().mockResolvedValue({}),
    signoutBySocialId: jest.fn().mockResolvedValue({})
  }

  const mockStorageAdapter = {}

  beforeEach(() => {
    jest.clearAllMocks()
    // Fix unbound method errors by using the proper mock assignment approach
    jest.spyOn(TokenStorage.prototype, 'getToken').mockResolvedValue(mockToken)
    jest.spyOn(TokenStorage.prototype, 'saveToken').mockResolvedValue({} as any)
    jest.spyOn(TokenStorage.prototype, 'deleteToken').mockResolvedValue()
    jest.spyOn(SyncManager.prototype, 'sync').mockResolvedValue()
    jest.spyOn(SyncManager.prototype, 'fullSync').mockResolvedValue()
  })

  it('should create a GmailClient instance', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any
    )

    expect(client).toBeInstanceOf(GmailClient)
    expect(TokenStorage).toHaveBeenCalled()
    expect(mockContext.info).toHaveBeenCalledWith('Created gmail client', expect.any(Object))
  })

  it('should create a GmailClient instance with auth code', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any,
      'auth-code'
    )

    expect(client).toBeInstanceOf(GmailClient)
    expect(mockedGoogleAuth.setCredentials).toHaveBeenCalled()
    expect(mockContext.info).toHaveBeenCalledWith('Created gmail client', expect.any(Object))
  })

  it('should generate auth URL', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any
    )

    const authUrl = client.getAuthUrl('https://callback-url.com')
    expect(authUrl).toBe('https://auth-url.com')
  })

  it('should sign out and clean up resources', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any
    )

    await client.signout()

    // Fix unbound method reference by using the spy
    expect(jest.spyOn(TokenStorage.prototype, 'deleteToken')).toHaveBeenCalledWith(mockSocialId._id)
    expect(mockContext.info).toHaveBeenCalledWith('Deactivate gmail client', expect.any(Object))
  })

  it('should create a message', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any
    )

    const newMessage = {
      _id: 'test-message-id',
      _class: 'class.NewMessage',
      space: 'space',
      status: 'new',
      from: mockSocialId._id,
      to: 'recipient@example.com',
      subject: 'Test Subject',
      content: '<p>Test content</p>'
    }

    // Mock internal TxOperations instance
    const mockTxOperations = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(undefined),
      createDoc: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      updateDoc: jest.fn().mockResolvedValue({}),
      tx: jest.fn().mockResolvedValue({})
    }

    // Access and replace the private TxOperations instance
    Object.defineProperty(client, 'client', {
      value: mockTxOperations,
      writable: true
    })

    await client.createMessage(newMessage as any)

    expect(mockTxOperations.updateDoc).toHaveBeenCalledWith('class.NewMessage', 'space', 'test-message-id', {
      status: 'sent'
    })
  })

  it('should sync messages', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any
    )

    await client.sync({ noNotify: true })

    // Fix unbound method reference by using the spy
    expect(jest.spyOn(SyncManager.prototype, 'sync')).toHaveBeenCalledWith(
      mockSocialId._id,
      { noNotify: true, spaceId: 'test-space-id' },
      'test@example.com'
    )
  })

  it('should initialize integration', async () => {
    const client = await GmailClient.create(
      mockContext as any,
      mockCredentials,
      mockUser,
      mockClient as any,
      mockWorkspaceClient as any,
      mockWorkspaceId,
      mockStorageAdapter as any
    )

    await client.initIntegration()

    expect(mockContext.info).toHaveBeenCalledWith('Init integration', expect.any(Object))
  })

  describe('initIntegration', () => {
    let client: GmailClient
    let mockTxOperations: any

    beforeEach(async () => {
      mockTxOperations = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        createDoc: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        updateDoc: jest.fn(),
        tx: jest.fn()
      }

      client = await GmailClient.create(
        mockContext as any,
        mockCredentials,
        mockUser,
        mockClient as any,
        mockWorkspaceClient as any,
        mockWorkspaceId,
        mockStorageAdapter as any
      )

      // Replace the private TxOperations instance
      Object.defineProperty(client, 'client', {
        value: mockTxOperations,
        writable: true
      })

      // Mock the methods that are called with void in initIntegration
      jest.spyOn(client, 'startSync' as any).mockResolvedValue(undefined)
      jest.spyOn(client, 'getNewMessagesAfterAuth').mockResolvedValue(undefined)
    })

    it('should use active integration if it exists', async () => {
      const activeIntegration = {
        _id: 'active-integration-1',
        value: 'test@example.com',
        disabled: false,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      mockTxOperations.findAll.mockResolvedValue([activeIntegration])

      await client.initIntegration()

      expect(mockTxOperations.findAll).toHaveBeenCalledWith('class.Integration', {
        createdBy: mockSocialId._id,
        type: 'gmail',
        value: 'test@example.com'
      })

      // Should not update the active integration
      expect(mockTxOperations.update).not.toHaveBeenCalled()
      // Should not create new integration
      expect(mockTxOperations.createDoc).not.toHaveBeenCalled()
    })

    it('should enable disabled integration if no active one exists', async () => {
      const disabledIntegration = {
        _id: 'disabled-integration-1',
        value: 'test@example.com',
        disabled: true,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      mockTxOperations.findAll.mockResolvedValue([disabledIntegration])

      await client.initIntegration()

      expect(mockTxOperations.update).toHaveBeenCalledWith(disabledIntegration, {
        disabled: false
      })

      // Should not create new integration
      expect(mockTxOperations.createDoc).not.toHaveBeenCalled()
    })

    it('should prefer active integration over disabled one', async () => {
      const activeIntegration = {
        _id: 'active-integration-1',
        value: 'test@example.com',
        disabled: false,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      const disabledIntegration = {
        _id: 'disabled-integration-1',
        value: 'test@example.com',
        disabled: true,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      mockTxOperations.findAll.mockResolvedValue([disabledIntegration, activeIntegration])

      await client.initIntegration()

      // Should not update the active integration
      expect(mockTxOperations.update).not.toHaveBeenCalledWith(activeIntegration, expect.any(Object))
      // Should not create new integration
      expect(mockTxOperations.createDoc).not.toHaveBeenCalled()
    })

    it('should disable multiple active integrations and keep one', async () => {
      const activeIntegration1 = {
        _id: 'active-integration-1',
        value: 'test@example.com',
        disabled: false,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      const activeIntegration2 = {
        _id: 'active-integration-2',
        value: 'test@example.com',
        disabled: false,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      mockTxOperations.findAll.mockResolvedValue([activeIntegration1, activeIntegration2])

      await client.initIntegration()

      // Should disable one of the active integrations
      expect(mockTxOperations.update).toHaveBeenCalledWith(activeIntegration2, {
        disabled: true
      })

      // Should warn about multiple active integrations
      expect(mockContext.warn).toHaveBeenCalledWith(
        'Found several active integrations for the same email, disabling one',
        {
          email: 'test@example.com',
          integrationId: 'active-integration-2'
        }
      )

      // Should not create new integration
      expect(mockTxOperations.createDoc).not.toHaveBeenCalled()
    })

    it('should handle mixed active and disabled integrations correctly', async () => {
      const activeIntegration = {
        _id: 'active-integration-1',
        value: 'test@example.com',
        disabled: false,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      const disabledIntegration1 = {
        _id: 'disabled-integration-1',
        value: 'test@example.com',
        disabled: true,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      const disabledIntegration2 = {
        _id: 'disabled-integration-2',
        value: 'test@example.com',
        disabled: true,
        type: 'gmail',
        createdBy: mockSocialId._id
      }

      mockTxOperations.findAll.mockResolvedValue([disabledIntegration1, activeIntegration, disabledIntegration2])

      await client.initIntegration()

      // Should not update any integration (disabled ones should remain disabled, active one should remain active)
      expect(mockTxOperations.update).not.toHaveBeenCalled()

      // Should not create new integration
      expect(mockTxOperations.createDoc).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockTxOperations.findAll.mockRejectedValue(new Error('Database error'))

      await client.initIntegration()

      expect(mockContext.info).toHaveBeenCalledWith('Failed to start message sync', {
        workspaceUuid: mockUser.workspace,
        userId: mockUser.userId,
        error: 'Database error'
      })
    })
  })
})
