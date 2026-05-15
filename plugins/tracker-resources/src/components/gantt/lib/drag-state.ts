import type { DragState, DragTarget } from './types'

export function activeDragTargetId (state: DragState): string | null {
  if (!('target' in state)) return null

  const target = state.target
  if (!isDragTarget(target)) return null

  const id = target.doc._id
  return id !== undefined ? String(id) : null
}

function isDragTarget (target: unknown): target is DragTarget {
  return (
    typeof target === 'object' &&
    target !== null &&
    'doc' in target &&
    typeof (target as { doc?: unknown }).doc === 'object' &&
    (target as { doc?: unknown }).doc !== null
  )
}
