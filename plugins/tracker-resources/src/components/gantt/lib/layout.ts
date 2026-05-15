//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Issue } from '@hcengineering/tracker'
import { type LayoutRow } from './types'

export type GroupBy = 'none' | 'component' | 'milestone'

const DEFAULT_OVERSCAN_PX = 240

/**
 * Flatten the issues array into rows ordered by (parent → child) DFS,
 * computing y-coords from rowHeight.
 */
export function buildLayout (issues: Issue[], _group: GroupBy, rowHeight: number): LayoutRow[] {
  const childrenOf = new Map<string, Issue[]>()
  const roots: Issue[] = []
  for (const i of issues) {
    const parentId = i.parents?.[0]?.parentId
    if (parentId !== undefined && parentId !== null) {
      const list = childrenOf.get(parentId as unknown as string) ?? []
      list.push(i)
      childrenOf.set(parentId as unknown as string, list)
    } else {
      roots.push(i)
    }
  }

  const rows: LayoutRow[] = []
  let y = 0

  function emit (i: Issue, depth: number): void {
    const kids = childrenOf.get(i._id as unknown as string) ?? []
    rows.push({
      kind: 'issue',
      y,
      height: rowHeight,
      depth,
      visible: true,
      issue: i,
      component: null,
      isSummary: kids.length > 0
    })
    y += rowHeight
    for (const c of kids) {
      emit(c, depth + 1)
    }
  }

  for (const r of roots) {
    emit(r, 0)
  }

  return rows
}

/**
 * Return the subset of rows whose [y, y+height] intersects
 * [viewportTop - overscan, viewportTop + viewportHeight + overscan].
 */
export function filterVisibleRows (
  rows: LayoutRow[],
  viewportTop: number,
  viewportHeight: number,
  overscan: number = DEFAULT_OVERSCAN_PX
): LayoutRow[] {
  const min = viewportTop - overscan
  const max = viewportTop + viewportHeight + overscan
  return rows.filter(r => r.y + r.height >= min && r.y <= max)
}
