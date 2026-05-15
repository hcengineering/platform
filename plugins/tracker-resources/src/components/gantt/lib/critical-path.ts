//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'
import type { CriticalPathResult } from './types'
import { detectCycle, addScheduleDays } from './scheduler'

const DAY_MS = 86_400_000

const EMPTY_RESULT: CriticalPathResult = {
  critical: new Set(),
  criticalRelations: new Set(),
  slack: new Map(),
  violatedRelations: new Set(),
  cycle: false
}

type ScheduledIssue = Issue & { startDate: number, dueDate: number }

function isScheduled (i: Issue): i is ScheduledIssue {
  return i.startDate != null && i.dueDate != null
}

interface Bound {
  /** Lower bound on ES (forward) or upper bound on LS (backward). */
  field: 'ES' | 'EF'
  value: number
}

/**
 * Forward-constraint helper: given relation A→B and the **already-computed**
 * forward fields of A, return the lower bound this relation imposes on
 * either ES(B) or EF(B).
 *
 * FS uses EF(A) + DAY_MS + lag*DAY_MS because dates are inclusive: the
 * successor can start at the earliest on the day AFTER the predecessor ends.
 * SS, FF, SF use the anchor directly with only lag applied.
 */
function forwardBound (rel: IssueRelation, predES: number, predEF: number): Bound {
  const lag = rel.lag ?? 0
  switch (rel.kind) {
    case 'finish-to-start':  return { field: 'ES', value: predEF + DAY_MS + lag * DAY_MS }
    case 'start-to-start':   return { field: 'ES', value: addScheduleDays(predES, lag) }
    case 'finish-to-finish': return { field: 'EF', value: addScheduleDays(predEF, lag) }
    case 'start-to-finish':  return { field: 'EF', value: addScheduleDays(predES, lag) }
  }
}

/**
 * Backward-constraint helper: given relation A→B and the **already-computed**
 * backward fields of B, return the upper bound this relation imposes on
 * either LS(A) or LF(A).
 *
 * FS uses LS(B) - DAY_MS (mirror of the +DAY_MS in forwardBound).
 */
function backwardBound (rel: IssueRelation, succLS: number, succLF: number): Bound {
  const lag = rel.lag ?? 0
  switch (rel.kind) {
    case 'finish-to-start':  return { field: 'EF', value: succLS - DAY_MS - lag * DAY_MS }
    case 'start-to-start':   return { field: 'ES', value: addScheduleDays(succLS, -lag) }
    case 'finish-to-finish': return { field: 'EF', value: addScheduleDays(succLF, -lag) }
    case 'start-to-finish':  return { field: 'ES', value: addScheduleDays(succLF, -lag) }
  }
}

/** Returns issues in a topologically sorted order. Assumes graph is acyclic. */
function topoSort (issues: ScheduledIssue[], relations: IssueRelation[]): ScheduledIssue[] {
  const byRef = new Map<Ref<Issue>, ScheduledIssue>()
  for (const i of issues) byRef.set(i._id, i)
  const inDegree = new Map<Ref<Issue>, number>()
  for (const i of issues) inDegree.set(i._id, 0)
  for (const r of relations) {
    if (byRef.has(r.target)) {
      inDegree.set(r.target, (inDegree.get(r.target) ?? 0) + 1)
    }
  }
  const out = new Map<Ref<Issue>, Ref<Issue>[]>()
  for (const r of relations) {
    if (!byRef.has(r.attachedTo) || !byRef.has(r.target)) continue
    const bucket = out.get(r.attachedTo)
    if (bucket === undefined) out.set(r.attachedTo, [r.target])
    else bucket.push(r.target)
  }
  const queue: Ref<Issue>[] = []
  for (const [ref, deg] of inDegree) if (deg === 0) queue.push(ref)
  const order: ScheduledIssue[] = []
  while (queue.length > 0) {
    const cur = queue.shift() as Ref<Issue>
    const i = byRef.get(cur)
    if (i !== undefined) order.push(i)
    for (const next of out.get(cur) ?? []) {
      const d = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  return order
}

/**
 * Compute the critical path for the given issue + relation graph.
 *
 * Single-source forward pass (ES/EF) over a topological order, then
 * single-sink backward pass (LS/LF) per connected component. Slack = LS - ES.
 * An issue is critical iff slack <= 0. A relation is critical iff both
 * endpoints are critical AND the relation is the binding constraint for the
 * successor's anchor.
 *
 * Returns EMPTY_RESULT with `cycle: true` if the relation graph is cyclic —
 * the UI surfaces a banner in that case.
 *
 * The function is pure: it reads only its arguments and produces no
 * side-effects. Callers memoize the result via 200ms debounce in GanttView's
 * reactive recompute.
 */
export function computeCriticalPath (
  issues: Issue[],
  relations: IssueRelation[]
): CriticalPathResult {
  // Graceful degrade on cycle (reuse PR4b's DFS helper).
  if (detectCycle(relations) !== null) {
    return { ...EMPTY_RESULT, cycle: true }
  }

  const scheduled: ScheduledIssue[] = issues.filter(isScheduled)
  if (scheduled.length === 0) return EMPTY_RESULT

  // Filter relations to only those whose both endpoints are scheduled.
  const scheduledSet = new Set<Ref<Issue>>(scheduled.map((i) => i._id))
  const activeRels = relations.filter((r) => scheduledSet.has(r.attachedTo) && scheduledSet.has(r.target))

  // ES/EF maps initialised from stored dates.
  const es = new Map<Ref<Issue>, number>()
  const ef = new Map<Ref<Issue>, number>()
  for (const i of scheduled) {
    es.set(i._id, i.startDate)
    ef.set(i._id, i.dueDate)
  }

  // Index relations per target for incoming traversal.
  const incoming = new Map<Ref<Issue>, IssueRelation[]>()
  for (const r of activeRels) {
    const bucket = incoming.get(r.target)
    if (bucket === undefined) incoming.set(r.target, [r])
    else bucket.push(r)
  }

  // Index outgoing relations.
  const outgoing = new Map<Ref<Issue>, IssueRelation[]>()
  for (const r of activeRels) {
    const bucket = outgoing.get(r.attachedTo)
    if (bucket === undefined) outgoing.set(r.attachedTo, [r])
    else bucket.push(r)
  }

  // Forward pass over topological order: tighten ES/EF based on each
  // incoming relation. Duration (EF - ES) is preserved per issue unless the
  // user-stored values are explicitly clamped (violated).
  const violated = new Set<Ref<IssueRelation>>()
  const order = topoSort(scheduled, activeRels)

  for (const i of order) {
    const incRels = incoming.get(i._id) ?? []
    if (incRels.length === 0) continue
    const dur = i.dueDate - i.startDate  // inclusive: EF - ES in ms
    let newES = i.startDate
    let newEF = i.dueDate
    for (const r of incRels) {
      const pred = scheduled.find((p) => p._id === r.attachedTo)
      if (pred === undefined) continue
      const predES = es.get(pred._id) ?? pred.startDate
      const predEF = ef.get(pred._id) ?? pred.dueDate
      const b = forwardBound(r, predES, predEF)
      if (b.field === 'ES') {
        if (b.value > newES) { newES = b.value; newEF = newES + dur }
      } else {
        if (b.value > newEF) { newEF = b.value; newES = newEF - dur }
      }
    }
    // Clamp back to user-stored dates — if a relation would have shifted
    // us LATER than what the user pinned, record it as violated.
    if (newES > i.startDate) {
      for (const r of incRels) {
        const pred = scheduled.find((p) => p._id === r.attachedTo)
        if (pred === undefined) continue
        const b = forwardBound(r, es.get(pred._id) ?? pred.startDate, ef.get(pred._id) ?? pred.dueDate)
        if ((b.field === 'ES' && b.value > i.startDate) || (b.field === 'EF' && b.value > i.dueDate)) {
          violated.add(r._id)
        }
      }
      // User's pinned date wins; keep stored values.
      newES = i.startDate
      newEF = i.dueDate
    }
    es.set(i._id, newES)
    ef.set(i._id, newEF)
  }

  // Project finish = max EF over ALL sinks (standard CPM single-project
  // semantics; Codex review). An isolated issue with EF earlier than the
  // global maximum gets positive slack and is NOT critical — that matches
  // the user's mental model of a single Gantt = a single project.
  let projectFinish = -Infinity
  for (const i of scheduled) {
    if ((outgoing.get(i._id) ?? []).length === 0) {
      projectFinish = Math.max(projectFinish, ef.get(i._id) ?? i.dueDate)
    }
  }
  if (!isFinite(projectFinish)) {
    // All sinks resolved to -Infinity (empty graph) — bail with empty result.
    return EMPTY_RESULT
  }

  // Backward pass: LF = projectFinish for sinks, then min over successors.
  const ls = new Map<Ref<Issue>, number>()
  const lf = new Map<Ref<Issue>, number>()
  const reverseOrder = order.slice().reverse()
  for (const i of reverseOrder) {
    const dur = i.dueDate - i.startDate
    const outRels = outgoing.get(i._id) ?? []
    let newLF = outRels.length === 0 ? projectFinish : Infinity
    let newLS = newLF - dur
    for (const r of outRels) {
      const succ = scheduled.find((s) => s._id === r.target)
      if (succ === undefined) continue
      const succLS = ls.get(succ._id) ?? succ.startDate
      const succLF = lf.get(succ._id) ?? succ.dueDate
      const b = backwardBound(r, succLS, succLF)
      if (b.field === 'EF') {
        if (b.value < newLF) { newLF = b.value; newLS = newLF - dur }
      } else {
        if (b.value < newLS) { newLS = b.value; newLF = newLS + dur }
      }
    }
    ls.set(i._id, newLS)
    lf.set(i._id, newLF)
  }

  // Slack + critical predicate.
  const slack = new Map<Ref<Issue>, number>()
  const critical = new Set<Ref<Issue>>()
  for (const i of scheduled) {
    const s = (ls.get(i._id) ?? i.startDate) - (es.get(i._id) ?? i.startDate)
    slack.set(i._id, s)
    if (s <= 0) critical.add(i._id)
  }

  // Critical relations: both endpoints critical AND the relation is the
  // binding constraint for the successor's anchor (forward bound equals
  // the successor's actual computed anchor).
  const criticalRelations = new Set<Ref<IssueRelation>>()
  for (const r of activeRels) {
    if (!critical.has(r.attachedTo) || !critical.has(r.target)) continue
    const pred = scheduled.find((p) => p._id === r.attachedTo)
    const succ = scheduled.find((s) => s._id === r.target)
    if (pred === undefined || succ === undefined) continue
    const b = forwardBound(r, es.get(pred._id) ?? pred.startDate, ef.get(pred._id) ?? pred.dueDate)
    const succAnchor = b.field === 'ES' ? (es.get(succ._id) ?? succ.startDate) : (ef.get(succ._id) ?? succ.dueDate)
    if (b.value === succAnchor) criticalRelations.add(r._id)
  }

  return { critical, criticalRelations, slack, violatedRelations: violated, cycle: false }
}
