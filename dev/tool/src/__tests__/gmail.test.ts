import { getAccountClient } from '@hcengineering/server-client'
import { getClient as getKvsClient } from '@hcengineering/kvs-client'
import { generateToken } from '@hcengineering/server-token'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient, type Db } from 'mongodb'
import * as gmail from '../gmail'
import { SocialIdType } from '@hcengineering/core'

// Mock dependencies
jest.mock('@hcengineering/server-client', () => ({
  getAccountClient: jest.fn(),
  createClient: jest.fn().mockReturnValue({
    loadChunk: jest.fn().mockReturnValue({
      idx: 'chunk-idx',
      finished: true,
      docs: []
    }),
    loadDocs: jest.fn().mockReturnValue([
      {
        _id: '674d8b953f06c6ac0e9d8b38',
        _class: 'core:class:TxCreateDoc',
        space: 'core:space:Tx',
        objectId: '674d8b953f06c6ac0e9d8b37',
        objectClass: 'contact:class:PersonAccount',
        objectSpace: 'core:space:Model',
        modifiedOn: 1733135253612,
        modifiedBy: 'core:account:ConfigUser',
        createdBy: 'core:account:ConfigUser',
        attributes: {
          email: 'info@hardcoreeng.com',
          role: 'OWNER',
          person: '674d8b953f06c6ac0e9d8b37'
        }
      },
      {
        _id: '674d8bd73c9e6042074ed034',
        _class: 'core:class:TxUpdateDoc',
        space: 'core:space:Tx',
        modifiedBy: 'core:account:System',
        modifiedOn: 1733135319914,
        objectId: '674d8b953f06c6ac0e9d8b37',
        objectClass: 'contact:class:PersonAccount',
        objectSpace: 'core:space:Model',
        operations: { email: 'user1@example.com' },
        retrieve: null
      },
      {
        _id: '674d8b953f06c6ac0e9d8b45',
        _class: 'core:class:TxCreateDoc',
        space: 'core:space:Tx',
        objectId: '674d8be73c9e6042074ed039',
        objectClass: 'contact:class:PersonAccount',
        objectSpace: 'core:space:Model',
        modifiedOn: 1733135253612,
        modifiedBy: 'core:account:ConfigUser',
        createdBy: 'core:account:ConfigUser',
        attributes: {
          email: 'info@hardcoreeng.com',
          role: 'OWNER',
          person: '674d8be73c9e6042074ed039'
        }
      },
      {
        _id: '674d8bd73c9e6042074ed099',
        _class: 'core:class:TxUpdateDoc',
        space: 'core:space:Tx',
        modifiedBy: 'core:account:System',
        modifiedOn: 1733135319914,
        objectId: '674d8be73c9e6042074ed039',
        objectClass: 'contact:class:PersonAccount',
        objectSpace: 'core:space:Model',
        operations: { email: 'user2@example.com' },
        retrieve: null
      }
    ]),
    closeChunk: jest.fn(),
    close: jest.fn()
  }),
  getTransactorEndpoint: jest.fn()
}))
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
        userId: '674d8b953f06c6ac0e9d8b37',
        workspace: 'ws1',
        token: 'token1',
        refresh_token: 'refresh1',
        access_token: 'access1'
      },
      {
        userId: '674d8be73c9e6042074ed039',
        workspace: 'oldWs2',
        token: 'token2',
        refresh_token: 'refresh2',
        access_token: 'access2'
      }
    ])

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockImplementation((key) => {
      if (key === 'email:user1@example.com') {
        return Promise.resolve({ _id: 'social1', type: SocialIdType.EMAIL, personUuid: 'person1-uuid' })
      } else if (key === 'email:user2@example.com') {
        return Promise.resolve({ _id: 'social2', type: SocialIdType.EMAIL, personUuid: 'person2-uuid' })
      }
      console.log('No socialId mock found for key:', key)
      return Promise.resolve(undefined)
    })

    // Mock integration checks
    mockAccountClient.getIntegration.mockResolvedValue(null)
    mockAccountClient.getIntegrationSecret.mockResolvedValue(null)

    // Run migration
    await gmail.performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Verify tokens were migrated
    expect(mockAccountClient.createIntegration).toHaveBeenCalledTimes(2)
    expect(mockAccountClient.addIntegrationSecret).toHaveBeenCalledTimes(2)

    // Check that tokens were migrated with correct data
    const calls = mockAccountClient.addIntegrationSecret.mock.calls
    expect(calls).toContainEqual([
      expect.objectContaining({
        socialId: 'social1',
        workspaceUuid: 'ws1',
        secret: expect.stringContaining('person1-uuid')
      })
    ])
    expect(calls).toContainEqual([
      expect.objectContaining({
        socialId: 'social2',
        workspaceUuid: 'ws2',
        secret: expect.stringContaining('person2-uuid')
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
        userId: '674d8b953f06c6ac0e9d8b37',
        workspace: 'ws1',
        token: 'token1',
        historyId: 'history1'
      }
    ])

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockImplementation((key) => {
      if (key === 'email:user1@example.com') {
        return Promise.resolve({
          _id: 'social1',
          type: SocialIdType.EMAIL,
          personUuid: 'person1-uuid',
          value: 'user1@example.com'
        })
      }
      return Promise.resolve(undefined)
    })

    // Mock KVS client responses
    mockKvsClient.getValue.mockResolvedValue(null)

    // Run migration
    await gmail.performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

    // Verify KVS calls
    expect(mockKvsClient.setValue).toHaveBeenCalledWith(
      'history:ws1:social1',
      expect.objectContaining({
        historyId: 'history1',
        email: 'user1@example.com',
        userId: 'person1-uuid',
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
    await gmail.performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

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
      userId: '674d8b953f06c6ac0e9d8b37',
      workspace: 'ws1',
      token: 'token1',
      refresh_token: 'refresh1'
    })

    // Mock social ID lookup
    mockAccountClient.findFullSocialIdBySocialKey.mockResolvedValue({
      _id: 'social1',
      personUuid: 'person1',
      type: SocialIdType.EMAIL
    })

    // Mock existing integration and token
    mockAccountClient.getIntegration.mockResolvedValue({ _id: 'integration1' })
    mockAccountClient.getIntegrationSecret.mockResolvedValue({
      scope: 'old-scope',
      token_type: 'Bearer'
    })

    // Run migration
    await gmail.performGmailAccountMigrations(db, 'test-region', 'http://kvs-url')

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
