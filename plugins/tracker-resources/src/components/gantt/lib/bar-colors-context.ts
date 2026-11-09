//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Builds a project-scoped BarColorContext from live Huly data:
//   - statusCategoryMap : Ref<IssueStatus> stringified → category string
//   - componentsById    : Ref<Component> stringified → Component doc
//   - milestonesById    : Ref<Milestone> stringified → Milestone doc
//   - issues            : the current Gantt issue set (used to compute
//                          the Top-N assignee classification)
//
import type { Ref } from '@hcengineering/core'
import type { Issue, Component, Milestone } from '@hcengineering/tracker'
import type { BarColorContext } from './bar-colors'

const DONE_CATS = new Set(['task:statusCategory:Won', 'task:statusCategory:Lost'])

export function buildBarColorContext (
  issues: Issue[],
  statusCategoryMap: Map<string, string>,
  componentsById: Map<string, Component>,
  milestonesById: Map<string, Milestone>
): BarColorContext {
  // Top-8 assignees ranked by count of NOT-Done issues.
  const workload = new Map<string, number>()
  for (const i of issues) {
    if (i.assignee == null) continue
    const cat = statusCategoryMap.get(String(i.status))
    if (cat !== undefined && DONE_CATS.has(cat)) continue
    workload.set(String(i.assignee), (workload.get(String(i.assignee)) ?? 0) + 1)
  }
  const top = [...workload.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const rankById = new Map<string, number>()
  top.forEach(([id], idx) => rankById.set(id, idx))

  return {
    statusCategoryFor: (id) => statusCategoryMap.get(String(id)) ?? null,
    priorityFor: (issue) => issue.priority,
    assigneeRankFor: (issue) => {
      if (issue.assignee == null) return null
      const r = rankById.get(String(issue.assignee))
      return r ?? 8 // 9th palette slot = "other"
    },
    componentColorFor: (issue) => {
      const cid = (issue as any).component as Ref<Component> | null | undefined
      if (cid == null) return null
      const c = componentsById.get(String(cid))
      return c?.color
    },
    milestoneColorFor: (issue) => {
      const mid = (issue as any).milestone as Ref<Milestone> | null | undefined
      if (mid == null) return null
      const m = milestonesById.get(String(mid))
      return m?.color
    },
    hashFromId: (id) => {
      let h = 0
      for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
      return Math.abs(h)
    }
  }
}
