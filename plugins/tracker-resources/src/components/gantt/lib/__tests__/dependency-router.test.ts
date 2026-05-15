//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { DependencyKind } from '@hcengineering/tracker'
import { anchorOf, endpointPx, type BarRect } from '../dependency-router'

describe('anchorOf', () => {
  it.each<[DependencyKind, 'finish' | 'start', 'finish' | 'start']>([
    ['finish-to-start', 'finish', 'start'],
    ['start-to-start', 'start', 'start'],
    ['finish-to-finish', 'finish', 'finish'],
    ['start-to-finish', 'start', 'finish']
  ])('kind=%s → source=%s, target=%s', (kind, sourceA, targetA) => {
    expect(anchorOf(kind, 'source')).toBe(sourceA)
    expect(anchorOf(kind, 'target')).toBe(targetA)
  })
})

describe('endpointPx', () => {
  const bar: BarRect = { left: 100, top: 40, right: 220, bottom: 60 }
  it('start anchor returns the left edge midpoint', () => {
    expect(endpointPx(bar, 'start')).toEqual({ x: 100, y: 50 })
  })
  it('finish anchor returns the right edge midpoint', () => {
    expect(endpointPx(bar, 'finish')).toEqual({ x: 220, y: 50 })
  })
})
