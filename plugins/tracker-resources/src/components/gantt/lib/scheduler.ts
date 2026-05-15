//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

/**
 * Return every descendant of `issue` that has both `startDate` and `dueDate`
 * concretely set. Children/grandchildren are walked recursively via the
 * `issue.parents[0].parentId` pointer — that is the direct-parent field used
 * by the existing Gantt layout (`layout.ts:52`, `GanttView.svelte:192`).
 * Cycle-safe: each issue id is only visited once, so a buggy outline with
 * `a→b→a` is handled without an infinite loop.
 */
export function descendantsWithDates (issue: Issue, allIssues: Issue[]): Issue[] {
  const childrenByParent = new Map<Ref<Issue>, Issue[]>()
  for (const i of allIssues) {
    const parent = i.parents?.[0]?.parentId as Ref<Issue> | undefined
    if (parent === undefined) continue
    const bucket = childrenByParent.get(parent)
    if (bucket === undefined) {
      childrenByParent.set(parent, [i])
    } else {
      bucket.push(i)
    }
  }

  const visited = new Set<Ref<Issue>>([issue._id])
  const result: Issue[] = []
  const queue: Issue[] = [...(childrenByParent.get(issue._id) ?? [])]

  while (queue.length > 0) {
    const next = queue.shift() as Issue
    if (visited.has(next._id)) continue
    visited.add(next._id)
    if (next.startDate != null && next.dueDate != null) {
      result.push(next)
    }
    const children = childrenByParent.get(next._id)
    if (children !== undefined) {
      for (const c of children) queue.push(c)
    }
  }

  return result
}
