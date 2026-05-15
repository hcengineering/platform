//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { PrimaryEdit, CascadeShift, SimulateResult } from './types'

const DAY_MS = 86_400_000

/**
 * Schedule arithmetic — Phase-1 uses calendar days. Phase-2 will replace
 * the body with a working-calendar lookup; the signature is the
 * integration point. All cascade-math callers route through this helper.
 */
export function addScheduleDays (t: number, days: number): number {
  return t + days * DAY_MS
}

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

/**
 * Detects any cycle in the relation graph (without considering a candidate
 * new edge). Used by `simulateCascade` for the pre-flight safety check.
 * DFS with white/grey/black coloring; returns the refs that participate in
 * the first detected cycle, or null if the graph is a DAG.
 *
 * @remarks Recursive DFS — assumes relation chains stay well under V8's
 * ~10k call-stack ceiling. Realistic Gantt projects are far below that,
 * but if cascade is ever applied to enterprise graphs > 10k linear
 * chains, refactor to an explicit work-stack.
 */
export function detectCycle (relations: IssueRelation[]): Ref<Issue>[] | null {
  const out = new Map<Ref<Issue>, Ref<Issue>[]>()
  const nodes = new Set<Ref<Issue>>()
  for (const r of relations) {
    nodes.add(r.attachedTo)
    nodes.add(r.target)
    const bucket = out.get(r.attachedTo)
    if (bucket === undefined) {
      out.set(r.attachedTo, [r.target])
    } else {
      bucket.push(r.target)
    }
  }

  const WHITE = 0
  const GREY = 1
  const BLACK = 2
  const color = new Map<Ref<Issue>, number>()
  for (const n of nodes) color.set(n, WHITE)

  const stack: Ref<Issue>[] = []
  let cycle: Ref<Issue>[] | null = null

  function visit (n: Ref<Issue>): boolean {
    color.set(n, GREY)
    stack.push(n)
    const succs = out.get(n)
    if (succs !== undefined) {
      for (const next of succs) {
        const c = color.get(next) ?? WHITE
        if (c === GREY) {
          const idx = stack.indexOf(next)
          cycle = idx >= 0 ? stack.slice(idx) : [next]
          return true
        }
        if (c === WHITE && visit(next)) return true
      }
    }
    color.set(n, BLACK)
    stack.pop()
    return false
  }

  for (const n of nodes) {
    if ((color.get(n) ?? WHITE) === WHITE && visit(n)) return cycle
  }
  return null
}

const DEFAULT_MAX_ITERATIONS = 1000

interface WorkingDates {
  start: number
  due: number
}

export function simulateCascade (
  primary: PrimaryEdit[],
  allIssues: Issue[],
  relations: IssueRelation[],
  canEdit: (ref: Ref<Issue>) => boolean,
  options?: { maxIterations?: number }
): SimulateResult {
  // Step 0: pre-flight cycle check on the relation graph itself.
  const cycle = detectCycle(relations)
  if (cycle !== null) return { kind: 'cycle', cycleNodes: cycle }

  // Step 1: relation index.
  const bySource = new Map<Ref<Issue>, IssueRelation[]>()
  const byTarget = new Map<Ref<Issue>, IssueRelation[]>()
  for (const r of relations) {
    const bucket = bySource.get(r.attachedTo)
    if (bucket === undefined) bySource.set(r.attachedTo, [r])
    else bucket.push(r)
    const tbucket = byTarget.get(r.target)
    if (tbucket === undefined) byTarget.set(r.target, [r])
    else tbucket.push(r)
  }

  // Step 2: working state.
  const issuesByRef = new Map<Ref<Issue>, Issue>()
  for (const i of allIssues) issuesByRef.set(i._id, i)
  const current = new Map<Ref<Issue>, WorkingDates>()
  for (const i of allIssues) {
    if (i.startDate != null && i.dueDate != null) {
      current.set(i._id, { start: i.startDate, due: i.dueDate })
    }
  }
  const primarySet = new Set<Ref<Issue>>()
  for (const p of primary) {
    primarySet.add(p.issue._id)
    current.set(p.issue._id, { start: p.newStart, due: p.newDue })
  }

  const shifts = new Map<Ref<Issue>, CascadeShift>()
  const queue: Ref<Issue>[] = primary.map((p) => p.issue._id)
  const skippedRefs = new Set<Ref<Issue>>()
  const maxIter = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS

  // Step 4: BFS.
  let iterations = 0
  while (queue.length > 0) {
    if (++iterations > maxIter) return { kind: 'iteration-overflow' }
    const cur = queue.shift() as Ref<Issue>
    const curDates = current.get(cur)
    if (curDates === undefined) continue

    // Outgoing: cur is predecessor of rel.target.
    const outgoing = bySource.get(cur) ?? []
    // The start-delta of cur (vs its original start) is used to preserve
    // the relative gap when pushing a successor. This ensures that if cur
    // was itself shifted by N days (body-drag or cascaded), the successor
    // also shifts by at least N days (floor: constraint minimum wins when
    // the constraint requires a larger shift).
    const origCurStart = issuesByRef.get(cur)?.startDate ?? curDates.start
    const curStartDelta = curDates.start - origCurStart
    for (const r of outgoing) {
      // Primary-set protection during BFS: a primary issue's dates are
      // authoritative — never let a cascade propagation overwrite them.
      // Without this, a primary further down a chain could be silently
      // shifted (and trigger further cascades) before the post-loop merge.
      if (primarySet.has(r.target)) continue
      const targetIssue = issuesByRef.get(r.target)
      if (targetIssue === undefined) continue
      if (targetIssue.startDate == null || targetIssue.dueDate == null) {
        // Set semantics dedupe multi-path skip counts (DAG fan-in).
        skippedRefs.add(r.target)
        continue
      }
      const targetDates = current.get(r.target) as WorkingDates
      const lag = r.lag ?? 0
      let requiredAnchor: number
      let targetAnchorIsStart: boolean
      if (r.kind === 'finish-to-start') {
        requiredAnchor = addScheduleDays(curDates.due, lag)
        targetAnchorIsStart = true
      } else if (r.kind === 'start-to-start') {
        requiredAnchor = addScheduleDays(curDates.start, lag)
        targetAnchorIsStart = true
      } else if (r.kind === 'finish-to-finish') {
        requiredAnchor = addScheduleDays(curDates.due, lag)
        targetAnchorIsStart = false
      } else /* start-to-finish */ {
        requiredAnchor = addScheduleDays(curDates.start, lag)
        targetAnchorIsStart = false
      }

      const targetAnchor = targetAnchorIsStart ? targetDates.start : targetDates.due
      if (requiredAnchor > targetAnchor) {
        // FS gap-preservation: when cur was dragged by Δ days, the successor
        // should advance by at least Δ — not just enough to clear the FS
        // constraint. Without max(), dragging A by 3d into a relation with
        // 1d of slack would push B by only 1d, silently shrinking the
        // original A→B gap (auto-tightening, which spec §4 decision D
        // explicitly forbids). The snap term still wins when the
        // constraint itself requires a larger jump (e.g. lag changed).
        //
        // Other kinds don't need this: SS already anchors on cur.start,
        // so its required anchor naturally moves with curStartDelta. FF
        // and SF anchor on the cur side that may not match the dragged
        // side, so gap preservation isn't a clean concept there — pure
        // snap is the spec semantics.
        const snap = requiredAnchor
        const newAnchor = r.kind === 'finish-to-start'
          ? Math.max(snap, targetAnchor + curStartDelta)
          : snap
        const delta = newAnchor - targetAnchor
        const newStart = targetAnchorIsStart ? newAnchor : targetDates.start + delta
        const newDue = targetAnchorIsStart ? targetDates.due + delta : newAnchor
        current.set(r.target, { start: newStart, due: newDue })
        shifts.set(r.target, {
          issue: targetIssue,
          oldStart: targetIssue.startDate,
          oldDue: targetIssue.dueDate,
          newStart,
          newDue,
          reason: 'push-successor',
          triggeredBy: cur
        })
        queue.push(r.target)
      }
    }

    // Incoming: cur is successor of rel.attachedTo.
    const incoming = byTarget.get(cur) ?? []
    for (const r of incoming) {
      // Primary-set protection (mirror of the outgoing check above).
      if (primarySet.has(r.attachedTo)) continue
      const predIssue = issuesByRef.get(r.attachedTo)
      if (predIssue === undefined) continue
      if (predIssue.startDate == null || predIssue.dueDate == null) {
        skippedRefs.add(r.attachedTo)
        continue
      }
      const predDates = current.get(r.attachedTo) as WorkingDates
      const lag = r.lag ?? 0
      let requiredAnchor: number
      let predAnchorIsDue: boolean
      if (r.kind === 'finish-to-start') {
        requiredAnchor = addScheduleDays(curDates.start, -lag)
        predAnchorIsDue = true
      } else if (r.kind === 'start-to-start') {
        requiredAnchor = addScheduleDays(curDates.start, -lag)
        predAnchorIsDue = false
      } else if (r.kind === 'finish-to-finish') {
        requiredAnchor = addScheduleDays(curDates.due, -lag)
        predAnchorIsDue = true
      } else /* start-to-finish */ {
        requiredAnchor = addScheduleDays(curDates.due, -lag)
        predAnchorIsDue = false
      }
      const predAnchor = predAnchorIsDue ? predDates.due : predDates.start
      if (requiredAnchor < predAnchor) {
        const delta = predAnchor - requiredAnchor
        const newStart = predAnchorIsDue ? predDates.start - delta : requiredAnchor
        const newDue = predAnchorIsDue ? requiredAnchor : predDates.due - delta
        current.set(r.attachedTo, { start: newStart, due: newDue })
        shifts.set(r.attachedTo, {
          issue: predIssue,
          oldStart: predIssue.startDate,
          oldDue: predIssue.dueDate,
          newStart,
          newDue,
          reason: 'pull-predecessor',
          triggeredBy: cur
        })
        queue.push(r.attachedTo)
      }
    }
  }

  // Step 6: defensive merge — with the in-loop primary-set guards above,
  // shifts should never contain a primary ref. Belt-and-braces in case
  // a future code path inserts into `shifts` outside the guarded branches.
  for (const ref of primarySet) shifts.delete(ref)

  // Step 7: empty → no-cascade.
  if (shifts.size === 0) return { kind: 'no-cascade', primary }

  // Step 8: permission check.
  const locked: Issue[] = []
  for (const s of shifts.values()) {
    if (!canEdit(s.issue._id)) locked.push(s.issue)
  }
  if (locked.length > 0) {
    return {
      kind: 'permission-denied',
      lockedIssues: locked,
      primary,
      shifts: Array.from(shifts.values()),
      skippedUnscheduled: skippedRefs.size
    }
  }

  return {
    kind: 'cascade',
    primary,
    shifts: Array.from(shifts.values()),
    skippedUnscheduled: skippedRefs.size
  }
}
