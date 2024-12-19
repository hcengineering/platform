import { testDatabaseConnection, resetMocks, mockMongoConnect, mockMongoCommand, mockPgConnect, mockPgQuery } from './utils/db-utils';
import '@jest/globals';

jest.setTimeout(30000); // Increase timeout to 30 seconds

describe('Database Configuration', () => {
  beforeEach(() => {
    // Reset environment variable and mocks before each test
    delete process.env.HULY_DB_TYPE;
    resetMocks();
  });

  it('should connect to MongoDB when HULY_DB_TYPE=mongo', async () => {
    process.env.HULY_DB_TYPE = 'mongo';
    mockMongoConnect.mockResolvedValueOnce(undefined);
    mockMongoCommand.mockResolvedValueOnce({ ok: 1 });

    await expect(testDatabaseConnection('mongodb')).resolves.toBeTruthy();
    await expect(testDatabaseConnection('cockroach')).rejects.toThrow();

    expect(mockMongoConnect).toHaveBeenCalled();
    expect(mockMongoCommand).toHaveBeenCalledWith({ ping: 1 });
  });

  it('should connect to CockroachDB when HULY_DB_TYPE=cockroach', async () => {
    process.env.HULY_DB_TYPE = 'cockroach';
    mockPgConnect.mockResolvedValueOnce(undefined);
    mockPgQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    await expect(testDatabaseConnection('cockroach')).resolves.toBeTruthy();
    await expect(testDatabaseConnection('mongodb')).rejects.toThrow();

    expect(mockPgConnect).toHaveBeenCalled();
    expect(mockPgQuery).toHaveBeenCalledWith('SELECT 1');
  });

  it('should connect to both databases when HULY_DB_TYPE=all', async () => {
    process.env.HULY_DB_TYPE = 'all';
    mockMongoConnect.mockResolvedValue(undefined);
    mockMongoCommand.mockResolvedValue({ ok: 1 });
    mockPgConnect.mockResolvedValue(undefined);
    mockPgQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    await expect(testDatabaseConnection('mongodb')).resolves.toBeTruthy();
    await expect(testDatabaseConnection('cockroach')).resolves.toBeTruthy();
  });

  it('should default to all databases when HULY_DB_TYPE is not set', async () => {
    mockMongoConnect.mockResolvedValue(undefined);
    mockMongoCommand.mockResolvedValue({ ok: 1 });
    mockPgConnect.mockResolvedValue(undefined);
    mockPgQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    await expect(testDatabaseConnection('mongodb')).resolves.toBeTruthy();
    await expect(testDatabaseConnection('cockroach')).resolves.toBeTruthy();
  });

  it('should handle connection failures gracefully', async () => {
    process.env.HULY_DB_TYPE = 'all';
    mockMongoConnect.mockRejectedValue(new Error('Connection failed'));
    mockPgConnect.mockRejectedValue(new Error('Connection failed'));

    await expect(testDatabaseConnection('mongodb')).resolves.toBeFalsy();
    await expect(testDatabaseConnection('cockroach')).resolves.toBeFalsy();
  });
});
