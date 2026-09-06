//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
// Bar colouring for the Gantt canvas.
//
// This module owns the `GanttBarIssueLike` shape plus the overlay predicates
// (past-due / blocked / sub-issue progress) and the colour resolver
// (`BarColorMode`, `BarColorContext`, `resolveBarColors`). Resolver types are
// kept co-located with the resolver implementation.
//
import type { Ref } from '@hcengineering/core'
import type { Issue, IssueStatus, Component, Milestone } from '@hcengineering/tracker'
import { IssuePriority } from '@hcengineering/tracker'
import type { Person } from '@hcengineering/contact'

// `BarColorMode` is defined by the domain-neutral engine package. It is imported
// for use by the resolver below and re-exported so adapter-side consumers keep
// importing it from `./bar-colors`.
import type { BarColorMode } from '@hcengineering/gantt'

// ---------------------------------------------------------------------------
// Bar-color resolver
// ---------------------------------------------------------------------------

import { PaletteColorIndexes } from '@hcengineering/ui'
export type { BarColorMode }

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

export interface BarColorTriple {
  fill: string
  border: string
  text: string
  /** When set, callers resolve via getPlatformColor(paletteIndex, dark). fill/border become 'palette' markers. */
  paletteIndex?: number
}

export interface BarColorContext {
  // Callers guard `status === undefined` before invoking — see resolver's
  // 'status' branch and isPastDue().
  statusCategoryFor: (id: Ref<IssueStatus>) => string | null
  priorityFor: (issue: GanttBarIssueLike) => IssuePriority | undefined
  /** null → unassigned; number 0..8 → palette slot for the Top-N+other classification. */
  assigneeRankFor: (issue: GanttBarIssueLike) => number | null
  /** null → no component on the issue at all (use neutral); undefined → component exists but has no explicit color (use hash fallback); number → explicit. */
  componentColorFor: (issue: GanttBarIssueLike) => number | null | undefined
  milestoneColorFor: (issue: GanttBarIssueLike) => number | null | undefined
  hashFromId: (id: string) => number
}

const PRIORITY_PALETTE: Record<IssuePriority, number> = {
  [IssuePriority.NoPriority]: PaletteColorIndexes.Blueberry,
  [IssuePriority.Urgent]: PaletteColorIndexes.Orange,
  [IssuePriority.High]: PaletteColorIndexes.Sunshine,
  [IssuePriority.Medium]: PaletteColorIndexes.Ocean,
  [IssuePriority.Low]: PaletteColorIndexes.Cloud
}

const PALETTE_SIZE_24 = 24 // count of entries in PaletteColorIndexes enum (Firework..Porpoise, see packages/ui/src/colors.ts)

const NEUTRAL: BarColorTriple = {
  fill: 'var(--theme-button-default)',
  border: 'var(--theme-button-border)',
  text: 'var(--theme-content-color)'
}

function statusTriple (cat: string | null): BarColorTriple {
  switch (cat) {
    case 'task:statusCategory:UnStarted':
    case 'tracker:statusCategory:Backlog':
      return NEUTRAL
    case 'task:statusCategory:ToDo':
      return {
        fill: 'var(--theme-state-primary-color)',
        border: 'var(--theme-state-primary-hover)',
        text: 'var(--theme-button-contrast-color)'
      }
    case 'task:statusCategory:Active':
      return {
        fill: 'var(--theme-warning-color)',
        border: 'var(--theme-warning-color)',
        text: 'var(--theme-button-contrast-color)'
      }
    case 'task:statusCategory:Won':
      return {
        fill: 'var(--theme-state-positive-color)',
        border: 'var(--theme-state-positive-hover)',
        text: 'var(--theme-button-contrast-color)'
      }
    case 'task:statusCategory:Lost':
      return {
        fill: 'var(--theme-state-regular-background-color)',
        border: 'var(--theme-state-regular-color)',
        text: 'var(--theme-content-color)'
      }
    default:
      return NEUTRAL
  }
}

function paletteFill (index: number): BarColorTriple {
  return {
    fill: 'palette',
    border: 'palette',
    text: 'var(--theme-button-contrast-color)',
    paletteIndex: index
  }
}

export function resolveBarColors (issue: GanttBarIssueLike, mode: BarColorMode, ctx: BarColorContext): BarColorTriple {
  switch (mode) {
    case 'status':
      // status may be missing on synthetic milestone-summary bars
      if (issue.status === undefined) return NEUTRAL
      return statusTriple(ctx.statusCategoryFor(issue.status))

    case 'priority': {
      // priority may be missing on synthetic milestone-summary bars
      const p = ctx.priorityFor(issue)
      if (p === undefined) return NEUTRAL
      const idx = PRIORITY_PALETTE[p]
      if (idx === undefined) return NEUTRAL
      return paletteFill(idx)
    }

    case 'assignee': {
      const rank = ctx.assigneeRankFor(issue)
      if (rank == null) return NEUTRAL
      return paletteFill(rank)
    }

    case 'component': {
      // null on the issue means "no component assigned" → always neutral,
      // regardless of what the context returns.
      if (issue.component == null) return NEUTRAL
      const explicit = ctx.componentColorFor(issue)
      if (explicit === null) return NEUTRAL
      const idx = explicit ?? ctx.hashFromId(String(issue.component)) % PALETTE_SIZE_24
      return paletteFill(idx)
    }

    case 'milestone': {
      // null on the issue means "no milestone assigned" → always neutral.
      if (issue.milestone == null) return NEUTRAL
      const explicit = ctx.milestoneColorFor(issue)
      if (explicit === null) return NEUTRAL
      const idx = explicit ?? ctx.hashFromId(String(issue.milestone)) % PALETTE_SIZE_24
      return paletteFill(idx)
    }

    case 'none':
    default:
      return NEUTRAL
  }
}
