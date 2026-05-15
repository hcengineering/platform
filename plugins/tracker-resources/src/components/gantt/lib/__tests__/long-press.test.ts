//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  initial,
  reduceLongPress,
  LONG_PRESS_MS,
  MOVE_THRESHOLD_PX,
  type LongPressState
} from '../long-press'

describe('long-press — initial state', () => {
  it('starts idle', () => {
    expect(initial()).toEqual({ kind: 'idle' })
  })
})

describe('long-press — start', () => {
  it('moves from idle to pending with the start timestamp', () => {
    const state = reduceLongPress(initial(), { type: 'start', now: 1000, x: 100, y: 200 })
    expect(state.kind).toBe('pending')
    if (state.kind === 'pending') {
      expect(state.startedAt).toBe(1000)
      expect(state.x).toBe(100)
      expect(state.y).toBe(200)
    }
  })

  it('ignores a second start while pending', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 1000, x: 0, y: 0 })
    state = reduceLongPress(state, { type: 'start', now: 2000, x: 50, y: 50 })
    if (state.kind === 'pending') {
      expect(state.startedAt).toBe(1000) // unchanged
    }
  })
})

describe('long-press — tick threshold', () => {
  it('stays pending before threshold', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 0, y: 0 })
    state = reduceLongPress(state, { type: 'tick', now: LONG_PRESS_MS - 1 })
    expect(state.kind).toBe('pending')
  })

  it('fires exactly at threshold', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 0, y: 0 })
    state = reduceLongPress(state, { type: 'tick', now: LONG_PRESS_MS })
    expect(state.kind).toBe('fired')
  })

  it('fires after threshold', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 0, y: 0 })
    state = reduceLongPress(state, { type: 'tick', now: LONG_PRESS_MS + 50 })
    expect(state.kind).toBe('fired')
  })

  it('tick from idle stays idle', () => {
    const state = reduceLongPress(initial(), { type: 'tick', now: 1000 })
    expect(state.kind).toBe('idle')
  })

  it('tick when fired stays fired (idempotent)', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 0, y: 0 })
    state = reduceLongPress(state, { type: 'tick', now: LONG_PRESS_MS })
    state = reduceLongPress(state, { type: 'tick', now: LONG_PRESS_MS + 1000 })
    expect(state.kind).toBe('fired')
  })
})

describe('long-press — move cancellation', () => {
  it('cancels when movement exceeds threshold', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 100, y: 200 })
    state = reduceLongPress(state, { type: 'move', now: 50, x: 100 + MOVE_THRESHOLD_PX + 1, y: 200 })
    expect(state.kind).toBe('cancelled')
  })

  it('cancels on diagonal movement past threshold', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 100, y: 200 })
    state = reduceLongPress(state, { type: 'move', now: 50, x: 110, y: 210 })
    // sqrt(10^2 + 10^2) ≈ 14.14, > 10 threshold
    expect(state.kind).toBe('cancelled')
  })

  it('stays pending on movement within threshold', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 100, y: 200 })
    state = reduceLongPress(state, { type: 'move', now: 50, x: 105, y: 203 })
    // sqrt(5^2 + 3^2) ≈ 5.83, < 10 threshold
    expect(state.kind).toBe('pending')
  })

  it('move from idle stays idle', () => {
    const state = reduceLongPress(initial(), { type: 'move', now: 50, x: 9999, y: 9999 })
    expect(state.kind).toBe('idle')
  })

  it('move when fired does not retroactively cancel', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 100, y: 200 })
    state = reduceLongPress(state, { type: 'tick', now: LONG_PRESS_MS })
    state = reduceLongPress(state, { type: 'move', now: LONG_PRESS_MS + 10, x: 9999, y: 9999 })
    expect(state.kind).toBe('fired')
  })
})

describe('long-press — explicit cancel', () => {
  it('cancel from any active state returns idle', () => {
    let state: LongPressState = reduceLongPress(initial(), { type: 'start', now: 0, x: 0, y: 0 })
    state = reduceLongPress(state, { type: 'cancel' })
    expect(state.kind).toBe('idle')
  })

  it('cancel from idle is a no-op', () => {
    const state = reduceLongPress(initial(), { type: 'cancel' })
    expect(state.kind).toBe('idle')
  })
})
