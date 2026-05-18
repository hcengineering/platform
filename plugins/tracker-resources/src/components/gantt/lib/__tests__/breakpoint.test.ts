//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import {
  detectLayoutMode,
  isPhone,
  isTablet,
  isDesktop,
  PHONE_MAX_WIDTH,
  TABLET_MAX_WIDTH
} from '../breakpoint'

describe('breakpoint — detectLayoutMode', () => {
  it('classifies very small widths as phone', () => {
    expect(detectLayoutMode(320)).toBe('phone')
    expect(detectLayoutMode(390)).toBe('phone')
    expect(detectLayoutMode(640)).toBe('phone')
  })

  it('classifies mid widths as tablet', () => {
    expect(detectLayoutMode(641)).toBe('tablet')
    expect(detectLayoutMode(768)).toBe('tablet')
    expect(detectLayoutMode(1024)).toBe('tablet')
  })

  it('classifies large widths as desktop', () => {
    expect(detectLayoutMode(1025)).toBe('desktop')
    expect(detectLayoutMode(1440)).toBe('desktop')
    expect(detectLayoutMode(3840)).toBe('desktop')
  })

  it('treats degenerate widths as phone (safest read-only)', () => {
    expect(detectLayoutMode(0)).toBe('phone')
    expect(detectLayoutMode(-100)).toBe('phone')
    expect(detectLayoutMode(Number.NaN)).toBe('phone')
  })

  it('exposes breakpoint constants matching the spec', () => {
    expect(PHONE_MAX_WIDTH).toBe(640)
    expect(TABLET_MAX_WIDTH).toBe(1024)
  })
})

describe('breakpoint — predicates', () => {
  it('isPhone is true only on phone mode', () => {
    expect(isPhone('phone')).toBe(true)
    expect(isPhone('tablet')).toBe(false)
    expect(isPhone('desktop')).toBe(false)
  })

  it('isTablet is true only on tablet mode', () => {
    expect(isTablet('phone')).toBe(false)
    expect(isTablet('tablet')).toBe(true)
    expect(isTablet('desktop')).toBe(false)
  })

  it('isDesktop is true only on desktop mode', () => {
    expect(isDesktop('phone')).toBe(false)
    expect(isDesktop('tablet')).toBe(false)
    expect(isDesktop('desktop')).toBe(true)
  })
})
