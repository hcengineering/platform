//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import { reduce } from '../drag-controller'
import { createTimeScale, snapToUtcMidnight } from '../time-scale'
import type { DragState } from '../types'

const ts = createTimeScale('week', Date.UTC(2026, 0, 1))
const issueRef = 'issue-1' as Ref<Issue>

describe('drag-controller — idle transitions', () => {
  const idle: DragState = { kind: 'idle' }

  it('mouseenter-bar moves idle → hover-bar', () => {
    const next = reduce(idle, { type: 'mouseenter-bar', issueId: issueRef, edge: 'body' }, ts)
    expect(next).toEqual({ kind: 'hover-bar', issueId: issueRef, edge: 'body' })
  })

  it('mouseleave-bar stays idle when already idle', () => {
    const next = reduce(idle, { type: 'mouseleave-bar' }, ts)
    expect(next).toEqual(idle)
  })

  it('mousemove stays idle when no drag is active', () => {
    const next = reduce(idle, { type: 'mousemove', cursorX: 100 }, ts)
    expect(next).toEqual(idle)
  })

  it('mouseup stays idle when no drag is active', () => {
    const next = reduce(idle, { type: 'mouseup' }, ts)
    expect(next).toEqual(idle)
  })
})
