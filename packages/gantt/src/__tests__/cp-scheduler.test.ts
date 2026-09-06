//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { DebouncedRecompute } from '../cp-scheduler'

describe('DebouncedRecompute', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('runs once after the delay', () => {
    const run = jest.fn()
    const d = new DebouncedRecompute(200)
    d.schedule(run)
    expect(run).not.toHaveBeenCalled()
    jest.advanceTimersByTime(199)
    expect(run).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(d.pending).toBe(false)
  })

  it('collapses a burst into a single run with the latest callback', () => {
    const first = jest.fn()
    const last = jest.fn()
    const d = new DebouncedRecompute(200)
    d.schedule(first)
    jest.advanceTimersByTime(100)
    d.schedule(first)
    jest.advanceTimersByTime(100)
    d.schedule(last)
    jest.advanceTimersByTime(200)
    expect(first).not.toHaveBeenCalled()
    expect(last).toHaveBeenCalledTimes(1)
  })

  it('never runs a cancelled recompute — the both-toggles-off case', () => {
    const run = jest.fn()
    const d = new DebouncedRecompute(200)
    d.schedule(run)
    expect(d.pending).toBe(true)
    // User switches the critical-path overlay AND the slack column off before
    // the debounce elapses: the queued pass must not fire into a view that
    // renders neither, nor raise the cycle warning banner.
    d.cancel()
    expect(d.pending).toBe(false)
    jest.advanceTimersByTime(10_000)
    expect(run).not.toHaveBeenCalled()
  })

  it('cancel is idempotent and safe when nothing is pending', () => {
    const d = new DebouncedRecompute(200)
    expect(() => {
      d.cancel()
      d.cancel()
    }).not.toThrow()
    expect(d.pending).toBe(false)
  })

  it('can be re-armed after a cancel', () => {
    const run = jest.fn()
    const d = new DebouncedRecompute(200)
    d.schedule(run)
    d.cancel()
    d.schedule(run)
    jest.advanceTimersByTime(200)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
