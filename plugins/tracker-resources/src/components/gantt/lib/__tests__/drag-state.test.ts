import type { Issue } from '@hcengineering/tracker'
import { activeDragTargetId } from '../drag-state'
import type { DragState } from '../types'

const issue = {
  _id: 'issue-1',
  _class: 'tracker:class:Issue',
  space: 'tracker:project:DefaultProject'
} as unknown as Issue

describe('activeDragTargetId', () => {
  it('returns the wrapped drag target doc id for edit drags', () => {
    const state = {
      kind: 'dragging-body',
      target: { kind: 'issue', doc: issue },
      originStart: 0,
      originEnd: 1,
      cursorStartX: 0,
      previewStart: 0,
      previewEnd: 1
    } satisfies DragState

    expect(activeDragTargetId(state)).toBe('issue-1')
  })

  it('ignores connector target-hover states whose target is a raw issue', () => {
    const state = {
      kind: 'connector-target-hover',
      source: issue,
      target: issue,
      originPx: { x: 0, y: 0 },
      cursorPx: { x: 10, y: 10 }
    } satisfies DragState

    expect(activeDragTargetId(state)).toBeNull()
  })
})
