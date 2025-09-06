//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { IntegrationEventEmitter, getIntegrationEventBus, onIntegrationEvent } from '../events'

describe('IntegrationEventEmitter', () => {
  let emitter: IntegrationEventEmitter

  beforeEach(() => {
    emitter = new IntegrationEventEmitter()
  })

  describe('on', () => {
    it('should register event listener and return unsubscribe function', () => {
      const callback = jest.fn()
      const unsubscribe = emitter.on('test-event', callback)

      expect(typeof unsubscribe).toBe('function')
      expect(emitter.listenerCount('test-event')).toBe(1)
    })

    it('should support multiple listeners for the same event', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      emitter.on('test-event', callback1)
      emitter.on('test-event', callback2)

      expect(emitter.listenerCount('test-event')).toBe(2)
    })
  })

  describe('emit', () => {
    it('should call all registered listeners with event data', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      const testData = { test: 'data' }

      emitter.on('test-event', callback1)
      emitter.on('test-event', callback2)

      emitter.emit('test-event', testData)

      expect(callback1).toHaveBeenCalledWith(testData)
      expect(callback2).toHaveBeenCalledWith(testData)
    })

    it('should not throw when emitting event with no listeners', () => {
      expect(() => {
        emitter.emit('non-existent-event', {})
      }).not.toThrow()
    })

    it('should continue calling other listeners if one throws an error', () => {
      const callback1 = jest.fn(() => {
        throw new Error('Test error')
      })
      const callback2 = jest.fn()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      emitter.on('test-event', callback1)
      emitter.on('test-event', callback2)

      emitter.emit('test-event', {})

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith("Error in event listener for 'test-event':", expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('off', () => {
    it('should remove specific listener', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      emitter.on('test-event', callback1)
      emitter.on('test-event', callback2)

      expect(emitter.listenerCount('test-event')).toBe(2)

      emitter.off('test-event', callback1)

      expect(emitter.listenerCount('test-event')).toBe(1)

      emitter.emit('test-event', {})
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('should remove all listeners for event when no callback specified', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      emitter.on('test-event', callback1)
      emitter.on('test-event', callback2)

      expect(emitter.listenerCount('test-event')).toBe(2)

      emitter.off('test-event')

      expect(emitter.listenerCount('test-event')).toBe(0)
    })

    it('should not throw when removing non-existent listener', () => {
      const callback = jest.fn()
      expect(() => {
        emitter.off('non-existent-event', callback)
      }).not.toThrow()
    })

    it('should clean up event when last listener is removed', () => {
      const callback = jest.fn()
      emitter.on('test-event', callback)

      expect(emitter.listenerCount('test-event')).toBe(1)

      emitter.off('test-event', callback)

      expect(emitter.listenerCount('test-event')).toBe(0)
    })
  })

  describe('unsubscribe function', () => {
    it('should remove listener when called', () => {
      const callback = jest.fn()
      const unsubscribe = emitter.on('test-event', callback)

      expect(emitter.listenerCount('test-event')).toBe(1)

      unsubscribe()

      expect(emitter.listenerCount('test-event')).toBe(0)
    })

    it('should clean up event when last listener unsubscribes', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      const unsubscribe1 = emitter.on('test-event', callback1)
      const unsubscribe2 = emitter.on('test-event', callback2)

      expect(emitter.listenerCount('test-event')).toBe(2)

      unsubscribe1()
      expect(emitter.listenerCount('test-event')).toBe(1)

      unsubscribe2()
      expect(emitter.listenerCount('test-event')).toBe(0)
    })

    it('should be safe to call multiple times', () => {
      const callback = jest.fn()
      const unsubscribe = emitter.on('test-event', callback)

      unsubscribe()
      expect(() => {
        unsubscribe()
      }).not.toThrow()
      expect(emitter.listenerCount('test-event')).toBe(0)
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      emitter.on('event1', jest.fn())
      emitter.on('event1', jest.fn())
      emitter.on('event2', jest.fn())

      expect(emitter.listenerCount('event1')).toBe(2)
      expect(emitter.listenerCount('event2')).toBe(1)

      emitter.removeAllListeners('event1')

      expect(emitter.listenerCount('event1')).toBe(0)
      expect(emitter.listenerCount('event2')).toBe(1)
    })

    it('should remove all listeners for all events when no event specified', () => {
      emitter.on('event1', jest.fn())
      emitter.on('event2', jest.fn())

      expect(emitter.listenerCount('event1')).toBe(1)
      expect(emitter.listenerCount('event2')).toBe(1)

      emitter.removeAllListeners()

      expect(emitter.listenerCount('event1')).toBe(0)
      expect(emitter.listenerCount('event2')).toBe(0)
    })
  })

  describe('listenerCount', () => {
    it('should return correct listener count', () => {
      expect(emitter.listenerCount('test-event')).toBe(0)

      emitter.on('test-event', jest.fn())
      expect(emitter.listenerCount('test-event')).toBe(1)

      emitter.on('test-event', jest.fn())
      expect(emitter.listenerCount('test-event')).toBe(2)
    })

    it('should return 0 for non-existent events', () => {
      expect(emitter.listenerCount('non-existent')).toBe(0)
    })
  })
})

describe('getIntegrationEventBus', () => {
  afterEach(() => {
    // Reset the global instance after each test
    const eventBus = getIntegrationEventBus()
    eventBus.removeAllListeners()
  })

  it('should return singleton instance', () => {
    const eventBus1 = getIntegrationEventBus()
    const eventBus2 = getIntegrationEventBus()

    expect(eventBus1).toBe(eventBus2)
    expect(eventBus1).toBeInstanceOf(IntegrationEventEmitter)
  })

  it('should maintain state across calls', () => {
    const eventBus1 = getIntegrationEventBus()
    eventBus1.on('test-event', jest.fn())

    const eventBus2 = getIntegrationEventBus()
    expect(eventBus2.listenerCount('test-event')).toBe(1)
  })
})

describe('onIntegrationEvent', () => {
  let mockCallback: jest.Mock
  let mockFilter: jest.Mock

  beforeEach(() => {
    mockCallback = jest.fn()
    mockFilter = jest.fn()
    // Clear any existing listeners
    const eventBus = getIntegrationEventBus()
    eventBus.removeAllListeners()
  })

  afterEach(() => {
    const eventBus = getIntegrationEventBus()
    eventBus.removeAllListeners()
  })

  it('should register event listener without filter', () => {
    const unsubscribe = onIntegrationEvent('test-event', mockCallback)
    const eventBus = getIntegrationEventBus()

    expect(eventBus.listenerCount('test-event')).toBe(1)
    expect(typeof unsubscribe).toBe('function')

    const testData = { test: 'data' }
    eventBus.emit('test-event', testData)

    expect(mockCallback).toHaveBeenCalledWith(testData)
  })

  it('should register event listener with filter', () => {
    mockFilter.mockReturnValue(true)

    onIntegrationEvent('test-event', mockCallback, mockFilter)
    const eventBus = getIntegrationEventBus()

    const testData = { test: 'data' }
    eventBus.emit('test-event', testData)

    expect(mockFilter).toHaveBeenCalledWith(testData)
    expect(mockCallback).toHaveBeenCalledWith(testData)
  })

  it('should not call callback when filter returns false', () => {
    mockFilter.mockReturnValue(false)

    onIntegrationEvent('test-event', mockCallback, mockFilter)
    const eventBus = getIntegrationEventBus()

    const testData = { test: 'data' }
    eventBus.emit('test-event', testData)

    expect(mockFilter).toHaveBeenCalledWith(testData)
    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('should return working unsubscribe function', () => {
    const unsubscribe = onIntegrationEvent('test-event', mockCallback)
    const eventBus = getIntegrationEventBus()

    expect(eventBus.listenerCount('test-event')).toBe(1)

    unsubscribe()

    expect(eventBus.listenerCount('test-event')).toBe(0)
  })
})
