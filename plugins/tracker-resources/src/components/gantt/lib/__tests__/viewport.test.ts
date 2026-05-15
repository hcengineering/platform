//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { computeCanvasViewportWidth } from '../viewport'

describe('viewport', () => {
  it('subtracts the sticky sidebar and resize cell from the visible canvas width', () => {
    expect(computeCanvasViewportWidth(873, 280, 5)).toBe(588)
    expect(computeCanvasViewportWidth(433, 280, 5)).toBe(148)
  })

  it('never returns zero or negative width', () => {
    expect(computeCanvasViewportWidth(100, 280, 5)).toBe(1)
  })
})
