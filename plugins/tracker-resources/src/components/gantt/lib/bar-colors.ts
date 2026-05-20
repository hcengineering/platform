//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// NOTE: Task 2 lays down the GanttBarIssueLike type only. Task 5
// extends this file with BarColorMode, BarColorContext,
// resolveBarColors, etc. Keeping the resolver type co-located with
// the resolver implementation; the file is split across two tasks
// only because predicates (Task 2) and resolver (Task 5) need to
// reach green-test status in order.
//
import type { Ref } from '@hcengineering/core'
import type { Issue, IssueStatus, Component, Milestone } from '@hcengineering/tracker'
import { IssuePriority } from '@hcengineering/tracker'
import type { Person } from '@hcengineering/contact'

/**
 * Shape consumed by the resolver + predicates. Real Issues satisfy this
 * directly. Synthetic milestone-summary bars (GanttCanvas.svelte:299)
 * satisfy it with most fields undefined — the resolver/predicates handle
 * the absence by returning the NEUTRAL triple / false. _id is also
 * optional because synthetic bars do not pass one through today.
 */
export interface GanttBarIssueLike {
  _id?: Ref<any>
  title: string
  startDate: number | null
  dueDate: number | null
  status?: Ref<IssueStatus>
  priority?: IssuePriority
  assignee?: Ref<Person> | null
  component?: Ref<Component> | null
  milestone?: Ref<Milestone> | null
  subIssues?: number
  attachedTo?: Ref<Issue>
}
