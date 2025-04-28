import { getAccountClient } from '@hcengineering/server-client'
import { getClient as getKvsClient } from '@hcengineering/kvs-client'
import { generateToken } from '@hcengineering/server-token'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient, type Db } from 'mongodb'
import { performGmailAccountMigrations } from '../gmail'

// Mock dependencies
jest.mock('@hcengineering/server-client')
jest.mock('@hcengineering/server-token')
jest.mock('@hcengineering/kvs-client')

describe('Gmail Migrations', () => {
  // Setup MongoDB in-memory server
  let mongoServer: MongoMemoryServer
  let mongoClient: MongoClient
  let db: Db

  // Mock implementations
  const mockAccountClient = {
    listWorkspaces: jest.fn(),
    findFullSocialIdBySocialKey: jest.fn(),
    getIntegration: jest.fn(),
    createIntegration: jest.fn(),
    getIntegrationSecret: jest.fn(),
    addIntegrationSecret: jest.fn(),
    updateIntegrationSecret: jest.fn()
  }

  const mockKvsClient = {
    getValue: jest.fn(),
    setValue: jest.fn(),
    deleteKey: jest.fn(),
    listKeys: jest.fn()
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    mongoClient = await MongoClient.connect(uri)
    db = mongoClient.db('test-db')

    // Setup mocks
    ;(getAccountClient as jest.Mock).mockReturnValue(mockAccountClient)
    ;(getKvsClient as jest.Mock).mockReturnValue(mockKvsClient)
    ;(generateToken as jest.Mock).mockReturnValue('mock-token')
  })

  afterAll(async () => {
    await mongoClient.close()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup collections
    await db.collection('tokens').deleteMany({})
    await db.collection('histories').deleteMany({})

    // Reset mock implementations
    mockAccountClient.listWorkspaces.mockReset()
    mockAccountClient.findFullSocialIdBySocialKey.mockReset()
    mockAccountClient.getIntegration.mockReset()
    mockAccountClient.createIntegration.mockReset()
    mockAccountClient.getIntegrationSecret.mockReset()
    mockAccountClient.addIntegrationSecret.mockReset()
    mockAccountClient.updateIntegrationSecret.mockReset()

    mockKvsClient.getValue.mockReset()
    mockKvsClient.setValue.mockReset()
  }, 10000)

  it('should migrate tokens to new integration format', async () => {
    // Setup test data
    const workspace1 = { uuid: 'ws1', name: 'Workspace 1' }
    const workspace2 = { uuid: 'ws2', dataId: 'oldWs2', name: 'Workspace 2' }

    // Mock workspace list
    mockAccountClient.listWorkspaces.mockResolvedValue([workspace1, workspace2])

    // Setup tokens in DB
    await db.collection('tokens').insertMany([
      {
        userId: 'user1@example.com',
        workspace: 'ws1',
        token: 'token1',
        refresh_token: 'refresh1',
        access_token: 'access1'
      },
      {
        userId: 'user2@example.com',
        workspace: 'oldWs2',
        token: 'token2',
        refresh_token: 'refresh2',
        access_token: 'access2'
      }
    ])

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockImplementation((key) => {
      if (key === 'email:user1@example.com') {
        return Promise.resolve({ _id: 'social1', personUuid: 'person1' })
      } else if (key === 'email:user2@example.com') {
        return Promise.resolve({ _id: 'social2', personUuid: 'person2' })
      }
      return Promise.resolve(undefined)
    })

    // Mock integration checks
    mockAccountClient.getIntegration.mockResolvedValue(null)
    mockAccountClient.getIntegrationSecret.mockResolvedValue(null)

    // Run migration
    await performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Verify tokens were migrated
    expect(mockAccountClient.createIntegration).toHaveBeenCalledTimes(2)
    expect(mockAccountClient.addIntegrationSecret).toHaveBeenCalledTimes(2)

    // Check that tokens were migrated with correct data
    const calls = mockAccountClient.addIntegrationSecret.mock.calls
    expect(calls).toContainEqual([
      expect.objectContaining({
        socialId: 'social1',
        workspaceUuid: 'ws1',
        secret: expect.stringContaining('user1@example.com')
      })
    ])
    expect(calls).toContainEqual([
      expect.objectContaining({
        socialId: 'social2',
        workspaceUuid: 'ws2',
        secret: expect.stringContaining('user2@example.com')
      })
    ])
  })

  it('should migrate with oids and github ids', async () => {
    // Setup test data
    const workspace1 = { uuid: 'ws1', name: 'Workspace 1' }
    const workspace2 = { uuid: 'ws2', dataId: 'oldWs2', name: 'Workspace 2' }

    // Mock workspace list
    mockAccountClient.listWorkspaces.mockResolvedValue([workspace1, workspace2])

    // Setup tokens in DB
    await db.collection('tokens').insertMany([
      {
        userId: 'github:user1',
        workspace: 'ws1',
        token: 'token1',
        refresh_token: 'refresh1',
        access_token: 'access1'
      },
      {
        userId: 'openid:user2',
        workspace: 'oldWs2',
        token: 'token2',
        refresh_token: 'refresh2',
        access_token: 'access2'
      }
    ])

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockImplementation((key) => {
      if (key === 'github:user1') {
        return Promise.resolve({ _id: 'social1', personUuid: 'person1' })
      } else if (key === 'oidc:user2') {
        return Promise.resolve({ _id: 'social2', personUuid: 'person2' })
      }
      return Promise.resolve(undefined)
    })

    // Mock integration checks
    mockAccountClient.getIntegration.mockResolvedValue(null)
    mockAccountClient.getIntegrationSecret.mockResolvedValue(null)

    // Run migration
    await performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Verify tokens were migrated
    expect(mockAccountClient.createIntegration).toHaveBeenCalledTimes(2)
    expect(mockAccountClient.addIntegrationSecret).toHaveBeenCalledTimes(2)

    // Check that tokens were migrated with correct data
    const calls = mockAccountClient.addIntegrationSecret.mock.calls
    expect(calls).toContainEqual([
      expect.objectContaining({
        socialId: 'social1',
        workspaceUuid: 'ws1',
        secret: expect.stringContaining('github:user1')
      })
    ])
    expect(calls).toContainEqual([
      expect.objectContaining({
        socialId: 'social2',
        workspaceUuid: 'ws2',
        secret: expect.stringContaining('openid:user2')
      })
    ])
  })

  it('should migrate history records to KVS', async () => {
    // Setup test data
    const workspace1 = { uuid: 'ws1', name: 'Workspace 1' }

    // Mock workspace list
    mockAccountClient.listWorkspaces.mockResolvedValue([workspace1])

    // Setup histories in DB
    await db.collection('histories').insertMany([
      {
        userId: 'user1@example.com',
        workspace: 'ws1',
        token: 'token1',
        historyId: 'history1'
      }
    ])

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockImplementation((key) => {
      if (key === 'email:user1@example.com') {
        return Promise.resolve({ _id: 'social1', personUuid: 'person1' })
      }
      return Promise.resolve(undefined)
    })

    // Mock KVS client responses
    mockKvsClient.getValue.mockResolvedValue(null)

    // Run migration
    await performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Verify KVS calls
    expect(mockKvsClient.setValue).toHaveBeenCalledWith(
      'history:ws1:social1',
      expect.objectContaining({
        historyId: 'history1',
        email: 'user1@example.com',
        userId: 'person1',
        workspace: 'ws1'
      })
    )
  })

  it('should handle errors gracefully', async () => {
    // Mock console.error to capture errors
    const originalConsoleError = console.error
    console.error = jest.fn()

    // Setup test data that will cause errors
    mockAccountClient.listWorkspaces.mockResolvedValue([])
    mockAccountClient.findFullSocialIdBySocialKey.mockRejectedValue(new Error('Network error'))

    // Insert some data
    await db.collection('tokens').insertOne({
      userId: 'error@example.com',
      workspace: 'non-existent',
      token: 'token-error'
    })

    // Run migration
    await performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Should not throw but log errors
    expect(console.error).toHaveBeenCalled()

    // Restore console.error
    console.error = originalConsoleError
  })

  it('should update existing integration secrets', async () => {
    // Setup test data
    const workspace = { uuid: 'ws1', name: 'Workspace 1' }

    // Mock workspace list
    mockAccountClient.listWorkspaces.mockResolvedValue([workspace])

    // Setup token in DB
    await db.collection('tokens').insertOne({
      userId: 'user1@example.com',
      workspace: 'ws1',
      token: 'token1',
      refresh_token: 'refresh1'
    })

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockResolvedValue({ _id: 'social1', personUuid: 'person1' })

    // Mock existing integration and token
    mockAccountClient.getIntegration.mockResolvedValue({ _id: 'integration1' })
    mockAccountClient.getIntegrationSecret.mockResolvedValue({
      scope: 'old-scope',
      token_type: 'Bearer'
    })

    // Run migration
    await performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Verify update was called instead of add
    expect(mockAccountClient.createIntegration).not.toHaveBeenCalled()
    expect(mockAccountClient.addIntegrationSecret).not.toHaveBeenCalled()
    expect(mockAccountClient.updateIntegrationSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: expect.stringContaining('refresh1')
      })
    )
  })
})
