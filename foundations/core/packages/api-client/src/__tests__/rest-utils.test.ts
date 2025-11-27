//
// Copyright © 2025 Hardcore Engineering Inc.
//

import { withRetry, extractJson } from '../rest/utils'

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw error after max retries', async () => {
    const error = new Error('persistent failure')
    const fn = jest.fn().mockRejectedValue(error)

    await expect(withRetry(fn)).rejects.toThrow('persistent failure')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should use exponential backoff', async () => {
    const delays: number[] = []
    const startTimes: number[] = []
    let lastTime = Date.now()

    const fn = jest.fn(async () => {
      const now = Date.now()
      if (startTimes.length > 0) {
        delays.push(now - lastTime)
      }
      startTimes.push(now)
      lastTime = now
      throw new Error('fail')
    })

    await expect(withRetry(fn)).rejects.toThrow('fail')

    expect(fn).toHaveBeenCalledTimes(3)
    // Delays should be approximately 100ms and 200ms (with some tolerance)
    expect(delays.length).toBe(2)
    expect(delays[0]).toBeGreaterThanOrEqual(80)
    expect(delays[0]).toBeLessThan(150)
    expect(delays[1]).toBeGreaterThanOrEqual(180)
    expect(delays[1]).toBeLessThan(250)
  })

  it('should not decrement attempt when ignoreAttemptCheck returns true', async () => {
    let callCount = 0
    const fn = jest.fn(async () => {
      callCount++
      if (callCount <= 5) {
        throw new Error('ignore')
      }
      throw new Error('real error')
    })

    const ignoreCheck = jest.fn((err: any) => err.message === 'ignore')

    await expect(withRetry(fn, ignoreCheck)).rejects.toThrow('real error')

    // Should have tried more than 3 times because ignored errors don't count
    expect(fn.mock.calls.length).toBeGreaterThan(3)
    expect(ignoreCheck).toHaveBeenCalled()
  })

  it('should handle promise rejection', async () => {
    const fn = jest.fn(async () => {
      throw new Error('async error')
    })

    await expect(withRetry(fn)).rejects.toThrow('async error')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should handle errors that bypass the check', async () => {
    const fn = jest.fn(async () => {
      // Always throw error
      throw new Error('persistent error')
    })

    const ignoreCheck = jest.fn(() => false) // Never ignore

    await expect(withRetry(fn, ignoreCheck)).rejects.toThrow('persistent error')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(ignoreCheck).toHaveBeenCalledTimes(3)
  })
})

describe('extractJson', () => {
  it('should extract plain JSON', async () => {
    const mockResponse = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      },
      text: jest.fn().mockResolvedValue('{"key":"value"}')
    } as any

    const result = await extractJson(mockResponse)

    expect(result).toEqual({ key: 'value' })
    expect(mockResponse.headers.get).toHaveBeenCalledWith('content-encoding')
  })

  it('should handle TotalArray dataType', async () => {
    const jsonString = JSON.stringify({
      dataType: 'TotalArray',
      value: [{ id: 1 }, { id: 2 }],
      total: 10,
      lookupMap: { key: 'value' }
    })

    const mockResponse = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      },
      text: jest.fn().mockResolvedValue(jsonString)
    } as any

    const result = await extractJson(mockResponse)

    expect(Array.isArray(result)).toBe(true)
    expect(result.total).toBe(10)
    expect(result.lookupMap).toEqual({ key: 'value' })
    expect(result[0]).toEqual({ id: 1 })
  })

  it('should handle snappy encoding header', async () => {
    // For this test, we'll just verify the snappy path is attempted
    // Actual snappy compression/decompression would require valid compressed data
    const mockResponse = {
      headers: {
        get: jest.fn().mockReturnValue('snappy')
      },
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    } as any

    // This will fail to decompress, but we're testing that the snappy path is taken
    await expect(extractJson(mockResponse)).rejects.toThrow()

    expect(mockResponse.headers.get).toHaveBeenCalledWith('content-encoding')
    expect(mockResponse.arrayBuffer).toHaveBeenCalled()
  })

  it('should handle empty JSON object', async () => {
    const mockResponse = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      },
      text: jest.fn().mockResolvedValue('{}')
    } as any

    const result = await extractJson(mockResponse)

    expect(result).toEqual({})
  })

  it('should handle nested objects', async () => {
    const nestedData = {
      level1: {
        level2: {
          dataType: 'TotalArray',
          value: [1, 2, 3],
          total: 3,
          lookupMap: {}
        }
      }
    }

    const mockResponse = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      },
      text: jest.fn().mockResolvedValue(JSON.stringify(nestedData))
    } as any

    const result = await extractJson(mockResponse)

    expect(result.level1.level2.total).toBe(3)
    expect(Array.isArray(result.level1.level2)).toBe(true)
  })

  it('should throw error on invalid JSON', async () => {
    const mockResponse = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      },
      text: jest.fn().mockResolvedValue('invalid json{')
    } as any

    await expect(extractJson(mockResponse)).rejects.toThrow()
  })
})
