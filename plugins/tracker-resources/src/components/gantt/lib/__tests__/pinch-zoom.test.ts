//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  initial,
  reducePinch,
  computeDistance,
  computeCenter,
  computePxPerDayFromRatio,
  type PinchState
} from '../pinch-zoom'

describe('pinch-zoom — math helpers', () => {
  it('computeDistance: axis-aligned', () => {
    expect(computeDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('computeDistance: zero-vector is 0', () => {
    expect(computeDistance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0)
  })

  it('computeCenter: midpoint of two pointers', () => {
    expect(computeCenter({ x: 0, y: 0 }, { x: 100, y: 200 })).toEqual({ x: 50, y: 100 })
  })

  it('computePxPerDayFromRatio: ratio>1 zooms in (more pixels per day)', () => {
    expect(computePxPerDayFromRatio(14, 2)).toBe(28)
  })

  it('computePxPerDayFromRatio: ratio<1 zooms out', () => {
    expect(computePxPerDayFromRatio(14, 0.5)).toBe(7)
  })

  it('computePxPerDayFromRatio: clamps to MIN/MAX', () => {
    expect(computePxPerDayFromRatio(14, 0.0001)).toBeGreaterThan(0)
    expect(computePxPerDayFromRatio(14, 10000)).toBeLessThanOrEqual(200)
  })

  it('computePxPerDayFromRatio: handles non-finite ratio', () => {
    expect(computePxPerDayFromRatio(14, Number.NaN)).toBe(14)
    expect(computePxPerDayFromRatio(14, 0)).toBe(14)
  })
})

describe('pinch-zoom — single-pointer tracking', () => {
  it('starts idle', () => {
    expect(initial().kind).toBe('idle')
  })

  it('down → single', () => {
    const s = reducePinch(initial(), { type: 'down', id: 1, x: 50, y: 50, pxPerDay: 14 })
    expect(s.kind).toBe('single')
  })

  it('move with single-pointer does not zoom', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 50, y: 50, pxPerDay: 14 })
    s = reducePinch(s, { type: 'move', id: 1, x: 100, y: 80 })
    expect(s.kind).toBe('single')
  })

  it('up from single returns to idle', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 50, y: 50, pxPerDay: 14 })
    s = reducePinch(s, { type: 'up', id: 1 })
    expect(s.kind).toBe('idle')
  })
})

describe('pinch-zoom — two-pointer pinch', () => {
  it('second down → pinch with initial distance + center captured', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    expect(s.kind).toBe('pinch')
    if (s.kind === 'pinch') {
      expect(s.initialDistance).toBe(100)
      expect(s.center).toEqual({ x: 50, y: 0 })
      expect(s.initialPxPerDay).toBe(14)
    }
  })

  it('move during pinch updates current ratio', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    // Spread fingers apart: id=2 now at x=200 → new distance = 200, ratio = 2
    s = reducePinch(s, { type: 'move', id: 2, x: 200, y: 0 })
    expect(s.kind).toBe('pinch')
    if (s.kind === 'pinch') {
      expect(s.currentDistance).toBe(200)
    }
  })

  it('pinching closer reduces distance', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'move', id: 2, x: 50, y: 0 })
    if (s.kind === 'pinch') {
      expect(s.currentDistance).toBe(50)
    }
  })

  it('lifting one finger drops back to single (keeps tracking the other)', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'up', id: 2 })
    expect(s.kind).toBe('single')
  })

  it('cancel always returns to idle (iOS pointercancel during scroll)', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'cancel' })
    expect(s.kind).toBe('idle')
  })

  it('center recomputes from the original captured midpoint, not the live one', () => {
    // Spec §"Pinch": cursor-Anker = Midpoint zwischen den Fingern AT START.
    // We hold the captured center stable so the zoom doesn't drift if the
    // fingers slide together.
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'move', id: 2, x: 200, y: 0 })
    if (s.kind === 'pinch') {
      expect(s.center).toEqual({ x: 50, y: 0 }) // captured at down#2
    }
  })

  it('ignores moves from untracked pointer ids', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'move', id: 999, x: 50, y: 50 })
    expect(s.kind).toBe('single')
  })

  it('down for a third pointer keeps the pinch (only first 2 are tracked)', () => {
    let s: PinchState = reducePinch(initial(), { type: 'down', id: 1, x: 0, y: 0, pxPerDay: 14 })
    s = reducePinch(s, { type: 'down', id: 2, x: 100, y: 0, pxPerDay: 14 })
    const before = s
    s = reducePinch(s, { type: 'down', id: 3, x: 999, y: 999, pxPerDay: 14 })
    expect(s).toEqual(before)
  })
})
