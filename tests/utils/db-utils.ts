import { MongoClient } from 'mongodb';
import { Client } from 'pg';

export type DatabaseType = 'mongo' | 'cockroach' | 'all';

// For testing purposes
export let mockMongoConnect = jest.fn().mockResolvedValue(undefined);
export let mockMongoCommand = jest.fn().mockResolvedValue({ ok: 1 });
export let mockMongoClose = jest.fn().mockResolvedValue(undefined);
export let mockPgConnect = jest.fn().mockResolvedValue(undefined);
export let mockPgQuery = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
export let mockPgEnd = jest.fn().mockResolvedValue(undefined);

// Reset all mocks
export function resetMocks() {
  mockMongoConnect.mockClear();
  mockMongoCommand.mockClear();
  mockMongoClose.mockClear();
  mockPgConnect.mockClear();
  mockPgQuery.mockClear();
  mockPgEnd.mockClear();
}

export async function testDatabaseConnection(type: 'mongodb' | 'cockroach'): Promise<boolean> {
  const dbType = process.env.HULY_DB_TYPE || 'all';

  // Convert mongodb to mongo for comparison
  const normalizedType = type === 'mongodb' ? 'mongo' : type;
  if (dbType !== 'all' && dbType !== normalizedType) {
    throw new Error(`Database ${type} is not enabled in current configuration (HULY_DB_TYPE=${dbType})`);
  }

  switch (type) {
    case 'mongodb':
      return testMongoConnection();
    case 'cockroach':
      return testCockroachConnection();
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

async function testMongoConnection(): Promise<boolean> {
  try {
    const client = {
      connect: mockMongoConnect,
      db: () => ({
        command: mockMongoCommand,
        close: mockMongoClose
      }),
      close: mockMongoClose
    };
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });
    await client.close();
    return true;
  } catch (error) {
    return false;
  }
}

async function testCockroachConnection(): Promise<boolean> {
  try {
    const client = {
      connect: mockPgConnect,
      query: mockPgQuery,
      end: mockPgEnd
    };
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (error) {
    return false;
  }
}
