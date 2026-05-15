//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation } from '@hcengineering/tracker'
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

/**
 * Cycle-detection for IssueRelation graph (PR4a). Returns true iff adding
 * a `source → target` edge to the current relation set would close a
 * cycle. BFS from `target` along outgoing relations (`attachedTo === current`
 * yields edges `current → target` to follow); if we reach `source`, the
 * proposed edge closes a loop. Self-loops are always cycles.
 *
 * Complexity: O(V + E) per call. Called once on drag-release; never in
 * the render path.
 *
 * Spec §4 / brainstorm decision A (block + toast on cycle attempt).
 */
export function wouldCreateCycle (
  source: Ref<Issue>,
  target: Ref<Issue>,
  relations: IssueRelation[]
): boolean {
  if (source === target) return true

  // Adjacency: predecessor → successors.
  const out = new Map<Ref<Issue>, Ref<Issue>[]>()
  for (const r of relations) {
    const bucket = out.get(r.attachedTo)
    if (bucket === undefined) {
      out.set(r.attachedTo, [r.target])
    } else {
      bucket.push(r.target)
    }
  }

  // BFS forward from target; if we hit source, source→target would loop.
  const visited = new Set<Ref<Issue>>([target])
  const queue: Ref<Issue>[] = [target]
  while (queue.length > 0) {
    const cur = queue.shift() as Ref<Issue>
    const succs = out.get(cur)
    if (succs === undefined) continue
    for (const next of succs) {
      if (next === source) return true
      if (visited.has(next)) continue
      visited.add(next)
      queue.push(next)
    }
  }
  return false
}
