import { SingleFlight } from '../singleflight'

describe('SingleFlight', () => {
  let singleFlight: SingleFlight<string>

  beforeEach(() => {
    singleFlight = new SingleFlight<string>()
  })

  it('should execute function and return result', async () => {
    const result = await singleFlight.execute('key1', async () => {
      return 'result1'
    })

    expect(result).toBe('result1')
  })

  it('should deduplicate concurrent calls with the same key', async () => {
    let callCount = 0
    const fn = jest.fn(async () => {
      callCount++
      // Simulate some async work
      await new Promise((resolve) => setTimeout(resolve, 50))
      return `result-${callCount}`
    })

    // Start three concurrent calls with the same key
    const promises = [
      singleFlight.execute('key1', fn),
      singleFlight.execute('key1', fn),
      singleFlight.execute('key1', fn)
    ]

    const results = await Promise.all(promises)

    // Function should only be called once
    expect(fn).toHaveBeenCalledTimes(1)
    expect(callCount).toBe(1)

    // All results should be the same
    expect(results).toEqual(['result-1', 'result-1', 'result-1'])
  })

  it('should not deduplicate calls with different keys', async () => {
    let callCount = 0
    const fn = async (key: string): Promise<string> => {
      callCount++
      await new Promise((resolve) => setTimeout(resolve, 50))
      return `${key}-result-${callCount}`
    }

    // Start concurrent calls with different keys
    const promises = [
      singleFlight.execute('key1', () => fn('key1')),
      singleFlight.execute('key2', () => fn('key2')),
      singleFlight.execute('key3', () => fn('key3'))
    ]

    const results = await Promise.all(promises)

    // Function should be called three times (once per key)
    expect(callCount).toBe(3)

    // Results should be different
    expect(new Set(results).size).toBe(3)
    expect(results.some((r) => r.includes('key1'))).toBe(true)
    expect(results.some((r) => r.includes('key2'))).toBe(true)
    expect(results.some((r) => r.includes('key3'))).toBe(true)
  })

  it('should handle errors properly', async () => {
    const error = new Error('Test error')
    const fn = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      throw error
    })

    // Start concurrent calls
    const promises = [
      singleFlight.execute('key1', fn),
      singleFlight.execute('key1', fn),
      singleFlight.execute('key1', fn)
    ]

    // All should reject with the same error
    await expect(Promise.all(promises)).rejects.toThrow('Test error')

    // Function should only be called once
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should clean up after successful execution', async () => {
    await singleFlight.execute('key1', async () => 'result1')

    // Second call with same key should execute the function again
    let secondCallExecuted = false
    await singleFlight.execute('key1', async () => {
      secondCallExecuted = true
      return 'result2'
    })

    expect(secondCallExecuted).toBe(true)
  })

  it('should clean up after failed execution', async () => {
    try {
      await singleFlight.execute('key1', async () => {
        throw new Error('First call error')
      })
    } catch {
      // Expected error
    }

    // Second call with same key should execute the function again
    const result = await singleFlight.execute('key1', async () => 'result2')
    expect(result).toBe('result2')
  })

  it('should handle mixed success and failure for concurrent calls', async () => {
    const fn = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      throw new Error('Test error')
    })

    // Start one call that will fail
    const promise1 = singleFlight.execute('key1', fn)

    // Wait a bit then start another call with same key
    await new Promise((resolve) => setTimeout(resolve, 10))
    const promise2 = singleFlight.execute('key1', fn)

    // Both should fail with the same error
    await expect(promise1).rejects.toThrow('Test error')
    await expect(promise2).rejects.toThrow('Test error')

    // Function should only be called once
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle rapid sequential calls', async () => {
    let executionCount = 0

    // First batch of concurrent calls
    const batch1 = Promise.all([
      singleFlight.execute('key1', async () => {
        executionCount++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'batch1'
      }),
      singleFlight.execute('key1', async () => 'should-not-execute'),
      singleFlight.execute('key1', async () => 'should-not-execute')
    ])

    const results1 = await batch1
    expect(results1).toEqual(['batch1', 'batch1', 'batch1'])
    expect(executionCount).toBe(1)

    // Second batch after first completes
    const batch2 = Promise.all([
      singleFlight.execute('key1', async () => {
        executionCount++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'batch2'
      }),
      singleFlight.execute('key1', async () => 'should-not-execute'),
      singleFlight.execute('key1', async () => 'should-not-execute')
    ])

    const results2 = await batch2
    expect(results2).toEqual(['batch2', 'batch2', 'batch2'])
    expect(executionCount).toBe(2)
  })

  it('should preserve the correct this context in the function', async () => {
    class TestClass {
      value = 'test-value'

      async getValue (): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return this.value
      }
    }

    const instance = new TestClass()

    const result = await singleFlight.execute('key1', () => instance.getValue())
    expect(result).toBe('test-value')
  })

  it('should work with different value types', async () => {
    // Number
    const numberSF = new SingleFlight<number>()
    const numResult = await numberSF.execute('key', async () => 42)
    expect(numResult).toBe(42)

    // Object
    interface TestObject {
      id: number
      name: string
    }
    const objectSF = new SingleFlight<TestObject>()
    const objResult = await objectSF.execute('key', async () => ({ id: 1, name: 'test' }))
    expect(objResult).toEqual({ id: 1, name: 'test' })

    // Array
    const arraySF = new SingleFlight<string[]>()
    const arrResult = await arraySF.execute('key', async () => ['a', 'b', 'c'])
    expect(arrResult).toEqual(['a', 'b', 'c'])
  })

  it('should handle synchronous exceptions', async () => {
    const fn = jest.fn(() => {
      throw new Error('Sync error')
    })

    const promises = [singleFlight.execute('key1', fn), singleFlight.execute('key1', fn)]

    await expect(Promise.all(promises)).rejects.toThrow('Sync error')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should handle async errors', async () => {
    const error = new Error('Async error')
    const fn = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      throw error
    })

    // Start concurrent calls
    const promises = [
      singleFlight.execute('async-error-key', fn),
      singleFlight.execute('async-error-key', fn),
      singleFlight.execute('async-error-key', fn)
    ]

    // All should reject with the same error
    await expect(Promise.all(promises)).rejects.toThrow('Async error')

    // Function should only be called once
    expect(fn).toHaveBeenCalledTimes(1)
  })

  describe('stress tests', () => {
    it('should handle many concurrent requests', async () => {
      let executionCount = 0
      const fn = async (): Promise<string> => {
        executionCount++
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'stress-result'
      }

      // Create 100 concurrent requests for the same key
      const promises = Array.from({ length: 100 }, () => singleFlight.execute('stress-key', fn))

      const results = await Promise.all(promises)

      expect(executionCount).toBe(1)
      expect(results).toHaveLength(100)
      expect(results.every((r) => r === 'stress-result')).toBe(true)
    })

    it('should handle many different keys', async () => {
      const executions = new Map<string, number>()

      const promises = Array.from({ length: 100 }, (_, i) => {
        const key = `key-${i % 10}` // 10 different keys, 10 requests each
        return singleFlight.execute(key, async () => {
          const count = executions.get(key) ?? 0
          executions.set(key, count + 1)
          await new Promise((resolve) => setTimeout(resolve, 10))
          return key
        })
      })

      await Promise.all(promises)

      // Each key should have been executed exactly once
      expect(executions.size).toBe(10)
      for (const count of executions.values()) {
        expect(count).toBe(1)
      }
    })
  })
})
