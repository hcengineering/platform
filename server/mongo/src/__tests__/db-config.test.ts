import { getMongoClient } from '..'
import { type MongoClient } from 'mongodb'
import { Client } from 'pg'

describe('Database Configuration', () => {
  let mongoClient: MongoClient
  let pgClient: Client

  beforeEach(() => {
    // Reset environment variable before each test
    delete process.env.HULY_DB_TYPE
  })

  afterEach(async () => {
    // Clean up connections after each test
    if (mongoClient != null) {
      await mongoClient.close()
    }
    if (pgClient != null) {
      await pgClient.end()
    }
  })

  async function testMongoConnection(): Promise<boolean> {
    try {
      const client = getMongoClient('mongodb://localhost:27017')
      mongoClient = await client.getClient()
      await mongoClient.db('admin').command({ ping: 1 })
      return true
    } catch (error) {
      return false
    }
  }

  async function testCockroachConnection(): Promise<boolean> {
    try {
      pgClient = new Client({
        host: 'localhost',
        port: 26257,
        database: 'defaultdb',
        user: 'root',
        ssl: false
      })
      await pgClient.connect()
      await pgClient.query('SELECT 1')
      return true
    } catch (error) {
      return false
    }
  }

  it('should connect to MongoDB when HULY_DB_TYPE=mongo', async () => {
    process.env.HULY_DB_TYPE = 'mongo'
    const mongoConnected = await testMongoConnection()
    const cockroachConnected = await testCockroachConnection()

    expect(mongoConnected).toBe(true)
    expect(cockroachConnected).toBe(false)
  })

  it('should connect to CockroachDB when HULY_DB_TYPE=cockroach', async () => {
    process.env.HULY_DB_TYPE = 'cockroach'
    const mongoConnected = await testMongoConnection()
    const cockroachConnected = await testCockroachConnection()

    expect(mongoConnected).toBe(false)
    expect(cockroachConnected).toBe(true)
  })

  it('should connect to both databases when HULY_DB_TYPE=all', async () => {
    process.env.HULY_DB_TYPE = 'all'
    const mongoConnected = await testMongoConnection()
    const cockroachConnected = await testCockroachConnection()

    expect(mongoConnected).toBe(true)
    expect(cockroachConnected).toBe(true)
  })

  it('should default to all databases when HULY_DB_TYPE is not set', async () => {
    const mongoConnected = await testMongoConnection()
    const cockroachConnected = await testCockroachConnection()

    expect(mongoConnected).toBe(true)
    expect(cockroachConnected).toBe(true)
  })
})
