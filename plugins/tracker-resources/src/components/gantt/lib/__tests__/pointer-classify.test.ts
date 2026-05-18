//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { classifyPointer, type PointerAction } from '../pointer-classify'

describe('pointer-classify — phone (read-only)', () => {
  it('allows tap on touch', () => {
    expect(classifyPointer('phone', 'touch', 'tap')).toBe('allow')
  })
  it('blocks drag on touch', () => {
    expect(classifyPointer('phone', 'touch', 'drag')).toBe('block')
  })
  it('blocks resize on touch', () => {
    expect(classifyPointer('phone', 'touch', 'resize')).toBe('block')
  })
  it('blocks connector on touch', () => {
    expect(classifyPointer('phone', 'touch', 'connector')).toBe('block')
  })
  it('blocks mouse drag too — phone is strictly read-only regardless of input', () => {
    expect(classifyPointer('phone', 'mouse', 'drag')).toBe('block')
  })
  it('treats pen identically to touch on phone', () => {
    expect(classifyPointer('phone', 'pen', 'drag')).toBe('block')
    expect(classifyPointer('phone', 'pen', 'tap')).toBe('allow')
  })
})

describe('pointer-classify — tablet (full edit, touch needs long-press)', () => {
  it('requires long-press for touch drag', () => {
    expect(classifyPointer('tablet', 'touch', 'drag')).toBe('long-press')
  })
  it('requires long-press for touch resize', () => {
    expect(classifyPointer('tablet', 'touch', 'resize')).toBe('long-press')
  })
  it('requires long-press for touch connector', () => {
    expect(classifyPointer('tablet', 'touch', 'connector')).toBe('long-press')
  })
  it('allows direct drag for mouse', () => {
    expect(classifyPointer('tablet', 'mouse', 'drag')).toBe('allow')
  })
  it('allows tap on touch directly', () => {
    expect(classifyPointer('tablet', 'touch', 'tap')).toBe('allow')
  })
  it('treats pen as mouse-equivalent (Apple Pencil with hardware keyboard)', () => {
    expect(classifyPointer('tablet', 'pen', 'drag')).toBe('allow')
  })
})

describe('pointer-classify — desktop', () => {
  it('allows everything directly for mouse', () => {
    const actions: PointerAction[] = ['tap', 'drag', 'resize', 'connector']
    for (const a of actions) {
      expect(classifyPointer('desktop', 'mouse', a)).toBe('allow')
    }
  })
  it('still long-presses touch on desktop (touch-laptop case)', () => {
    expect(classifyPointer('desktop', 'touch', 'drag')).toBe('long-press')
  })
})
