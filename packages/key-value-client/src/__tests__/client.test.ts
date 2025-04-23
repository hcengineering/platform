import { getClient } from '../client'
import { KeyValueClient } from '../types'
import fetchMock from 'jest-fetch-mock'

// Enable fetch mocks
fetchMock.enableMocks()

describe('KeyValueClient', () => {
  let client: KeyValueClient

  beforeEach(() => {
    // Reset fetch mocks for each test
    fetchMock.resetMocks()

    // Default successful response for all fetch calls
    fetchMock.mockResponse(JSON.stringify({ key: 'value' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

    client = getClient('https://api.example.com', 'test-token')
  })

  afterEach(() => {
    fetchMock.resetMocks()
  })

  it('should throw error when baseUrl is undefined', () => {
    expect(() => getClient(undefined)).toThrow('Key-value API URL not specified')
  })

  it('should throw error when baseUrl is empty', () => {
    expect(() => getClient('')).toThrow('Key-value API URL not specified')
  })

  describe('setValue', () => {
    it('should send POST request with correct headers and body', async () => {
      // Mock 204 response for setValue
      fetchMock.mockResponseOnce('', { status: 204 })

      const namespace = 'test-ns'
      const key = 'test-key'
      const value = { data: 'test-value' }

      await client.setValue(namespace, key, value)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/test-ns/test-key',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
            Connection: 'keep-alive'
          }),
          body: JSON.stringify(value)
        })
      )
    })

    it('should throw error when response status is not 204', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server error' }), { status: 500 })

      await expect(client.setValue('ns', 'key', 'value')).rejects.toThrow('Failed to store value')
    })
  })

  describe('getValue', () => {
    it('should send GET request with correct headers', async () => {
      const testData = { message: 'test data' }
      fetchMock.mockResponseOnce(JSON.stringify(testData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await client.getValue('ns', 'key')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/ns/key',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Connection: 'keep-alive'
          })
        })
      )
      expect(result).toEqual(testData)
    })

    it('should return null when key does not exist (404)', async () => {
      fetchMock.mockResponseOnce('', { status: 404 })

      const result = await client.getValue('ns', 'key')

      expect(result).toBeNull()
    })

    it('should throw error for non-404 error status', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server error' }), { status: 500 })

      await expect(client.getValue('ns', 'key')).rejects.toThrow('Request failed')
    })
  })

  describe('deleteKey', () => {
    it('should send DELETE request with correct headers', async () => {
      fetchMock.mockResponseOnce('', { status: 204 })

      await client.deleteKey('ns', 'key')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/ns/key',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Connection: 'keep-alive'
          })
        })
      )
    })

    it('should not throw error when key does not exist (404)', async () => {
      fetchMock.mockResponseOnce('', { status: 404 })

      await expect(client.deleteKey('ns', 'key')).resolves.toBeUndefined()
    })

    it('should throw error for status other than 204 or 404', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server error' }), { status: 500 })

      await expect(client.deleteKey('ns', 'key')).rejects.toThrow('Failed to delete key')
    })
  })

  describe('listKeys', () => {
    it('should send GET request to namespace endpoint', async () => {
      const testData = { key1: 'value1', key2: 'value2' }
      fetchMock.mockResponseOnce(JSON.stringify(testData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await client.listKeys('ns')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/ns',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(testData)
    })

    it('should include prefix query parameter when provided', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      await client.listKeys('ns', 'prefix')

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/ns?prefix=prefix', expect.anything())
    })

    it('should encode namespace and prefix properly', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      await client.listKeys('name/space', 'pre/fix')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/name%2Fspace?prefix=pre%2Ffix',
        expect.anything()
      )
    })
  })

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      // First call throws network error, second succeeds
      fetchMock.mockRejectOnce(new Error('Network error')).mockResponseOnce(JSON.stringify({ key: 'value' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await client.getValue('ns', 'key')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ key: 'value' })
    })
  })
})
