import { TickManagerImpl, FakeTickManager, groupByArray } from '../utils'

describe('TickManagerImpl extended tests', () => {
  test('register adds handler and returns unregister function', () => {
    const tickManager = new TickManagerImpl(100)

    const unregister = tickManager.register(async () => {}, 1)

    expect(typeof unregister).toBe('function')
    expect((tickManager as any).handlers.size).toBe(1)

    unregister()
    expect((tickManager as any).handlers.size).toBe(0)
  })

  test('multiple handlers can be registered', () => {
    const tickManager = new TickManagerImpl(100)

    tickManager.register(async () => {}, 1)
    tickManager.register(async () => {}, 1)

    expect((tickManager as any).handlers.size).toBe(2)
  })

  test('unregistering one handler does not affect others', () => {
    const tickManager = new TickManagerImpl(100)

    const unregister1 = tickManager.register(async () => {}, 1)
    const unregister2 = tickManager.register(async () => {}, 1)

    unregister1()

    expect((tickManager as any).handlers.size).toBe(1)

    unregister2()
    expect((tickManager as any).handlers.size).toBe(0)
  })

  test('tick calls registered handlers that match interval', async () => {
    const tickManager = new TickManagerImpl(10)
    const calls: number[] = []

    tickManager.register(async () => {
      calls.push(1)
    }, 1)
    tickManager.register(async () => {
      calls.push(2)
    }, 1)
    tickManager.register(async () => {
      calls.push(3)
    }, 1)

    // Run a few ticks
    await tickManager.tick()
    await tickManager.tick()

    expect(calls.length).toBeGreaterThan(0)
  })

  test('tick with zero handlers does not throw', async () => {
    const tickManager = new TickManagerImpl(100)
    await expect(tickManager.tick()).resolves.not.toThrow()
  })

  test('isMe checks tick alignment', async () => {
    const tickManager = new TickManagerImpl(10)

    // isMe takes tickId and seconds
    // After 1 tick, it should not match tick 0
    await tickManager.tick()
    expect(tickManager.isMe(0, 1)).toBe(false)
  })

  test('stop clears interval and prevents ticks', () => {
    const tickManager = new TickManagerImpl(10)
    let callCount = 0

    tickManager.register(async () => {
      callCount++
    }, 1)
    tickManager.start()

    // Allow some time for ticks
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        tickManager.stop()
        const countAtStop = callCount

        // Wait some more and verify no more ticks
        setTimeout(() => {
          expect(callCount).toBe(countAtStop)
          resolve()
        }, 50)
      }, 50)
    })
  })

  test('now returns current timestamp', () => {
    const tickManager = new TickManagerImpl(100)
    const now1 = tickManager.now()
    const now2 = tickManager.now()

    // Both calls should return reasonable timestamps (milliseconds since epoch or performance time)
    expect(now1).toBeGreaterThan(0)
    expect(now2).toBeGreaterThanOrEqual(now1)
  })

  test('waitTick resolves after specified number of ticks', async () => {
    const tickManager = new TickManagerImpl(10)
    tickManager.start()

    const before = tickManager._tick
    await tickManager.waitTick(3)
    const after = tickManager._tick

    expect(after).toBeGreaterThanOrEqual(before + 3)
    tickManager.stop()
  })

  test('waitTick throws for invalid ticks', async () => {
    const tickManager = new TickManagerImpl(100)
    await expect(tickManager.waitTick(0)).rejects.toThrow('Ticks must be >= 1')
  })

  test('register throws for invalid interval', () => {
    const tickManager = new TickManagerImpl(100)
    expect(() => tickManager.register(async () => {}, 0)).toThrow('Interval must be a finite number >= 1')
  })

  test('constructor throws for invalid tps', () => {
    expect(() => new TickManagerImpl(0)).toThrow('Ticks per second has an invalid value')
    expect(() => new TickManagerImpl(1001)).toThrow('Ticks per second has an invalid value')
  })
})

describe('FakeTickManager extended tests', () => {
  test('register adds handler to list', () => {
    const fakeManager = new FakeTickManager()

    const unregister = fakeManager.register(async () => {}, 1)

    expect((fakeManager as any).handlers.length).toBe(1)

    unregister()
    expect((fakeManager as any).handlers.length).toBe(0)
  })

  test('execAll calls all handlers', async () => {
    const fakeManager = new FakeTickManager()
    const calls: number[] = []

    fakeManager.register(async () => {
      calls.push(1)
    }, 1)
    fakeManager.register(async () => {
      calls.push(2)
    }, 1)

    await fakeManager.execAll()

    expect(calls).toEqual([1, 2])
  })

  test('setTime updates timestamp', () => {
    const fakeManager = new FakeTickManager()
    const newTime = 123456789

    fakeManager.setTime(newTime)

    expect(fakeManager.now()).toBe(newTime)
  })

  test('now returns controlled timestamp', () => {
    const fakeManager = new FakeTickManager()
    const time1 = fakeManager.now()

    fakeManager.setTime(time1 + 5000)
    const time2 = fakeManager.now()

    expect(time2).toBe(time1 + 5000)
  })

  test('waitTick resolves immediately', async () => {
    const fakeManager = new FakeTickManager()

    await expect(fakeManager.waitTick(3)).resolves.toBeUndefined()
    await expect(fakeManager.waitTick(0)).resolves.toBeUndefined()
  })

  test('stop does nothing but is safe to call', () => {
    const fakeManager = new FakeTickManager()
    expect(() => {
      fakeManager.stop()
    }).not.toThrow()
  })

  test('start does nothing but is safe to call', () => {
    const fakeManager = new FakeTickManager()
    expect(() => {
      fakeManager.start()
    }).not.toThrow()
  })
})

describe('groupByArray utility tests', () => {
  test('groups items by key function', () => {
    const items = [
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
      { type: 'a', value: 3 }
    ]

    const grouped = groupByArray(items, (item) => item.type)

    expect(grouped.get('a')).toEqual([
      { type: 'a', value: 1 },
      { type: 'a', value: 3 }
    ])
    expect(grouped.get('b')).toEqual([{ type: 'b', value: 2 }])
  })

  test('handles empty array', () => {
    const grouped = groupByArray([], () => 'key')

    expect(grouped.size).toBe(0)
  })

  test('handles single item', () => {
    const items = [{ id: 1 }]
    const grouped = groupByArray(items, (item) => item.id)

    expect(grouped.get(1)).toEqual([{ id: 1 }])
  })

  test('handles all items with same key', () => {
    const items = [
      { type: 'same', value: 1 },
      { type: 'same', value: 2 },
      { type: 'same', value: 3 }
    ]

    const grouped = groupByArray(items, (item) => item.type)

    expect(grouped.size).toBe(1)
    expect(grouped.get('same')).toHaveLength(3)
  })

  test('handles all items with different keys', () => {
    const items = [
      { id: 1, value: 'a' },
      { id: 2, value: 'b' },
      { id: 3, value: 'c' }
    ]

    const grouped = groupByArray(items, (item) => item.id)

    expect(grouped.size).toBe(3)
    expect(grouped.get(1)).toEqual([{ id: 1, value: 'a' }])
    expect(grouped.get(2)).toEqual([{ id: 2, value: 'b' }])
    expect(grouped.get(3)).toEqual([{ id: 3, value: 'c' }])
  })

  test('works with string keys', () => {
    const items = ['apple', 'apricot', 'banana', 'blueberry', 'cherry']
    const grouped = groupByArray(items, (item) => item[0])

    expect(grouped.get('a')).toEqual(['apple', 'apricot'])
    expect(grouped.get('b')).toEqual(['banana', 'blueberry'])
    expect(grouped.get('c')).toEqual(['cherry'])
  })

  test('works with numeric keys', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const grouped = groupByArray(items, (item) => item % 2)

    expect(grouped.get(0)).toEqual([2, 4, 6])
    expect(grouped.get(1)).toEqual([1, 3, 5])
  })
})
