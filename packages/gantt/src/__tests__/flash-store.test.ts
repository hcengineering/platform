//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { createFlashStore, flashIssues } from '../flash-store'

describe('flash-store', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts empty', () => {
    const store = createFlashStore()
    expect(store.get().size).toBe(0)
  })

  it('flashIssues adds ids and removes them after durationMs', () => {
    const store = createFlashStore()
    flashIssues(['a', 'b'], 1000, store)
    expect(store.get().has('a')).toBe(true)
    expect(store.get().has('b')).toBe(true)

    jest.advanceTimersByTime(999)
    expect(store.get().has('a')).toBe(true)

    jest.advanceTimersByTime(2)
    expect(store.get().has('a')).toBe(false)
    expect(store.get().has('b')).toBe(false)
  })

  it('flashIssues with overlapping ids extends duration to the latest call', () => {
    const store = createFlashStore()
    flashIssues(['a'], 1000, store)
    jest.advanceTimersByTime(500)
    flashIssues(['a'], 1000, store)
    jest.advanceTimersByTime(800) // total 1300ms since first call but only 800 since second
    expect(store.get().has('a')).toBe(true)
    jest.advanceTimersByTime(300)
    expect(store.get().has('a')).toBe(false)
  })
})
