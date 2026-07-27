//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
import { writable } from 'svelte/store'
import type { DropdownIntlItem } from '@hcengineering/ui'
import type { GroupByKey } from './lib/group-by'
import type { BarColorMode } from './lib/bar-colors'
import type { ToolbarTier } from '@hcengineering/gantt'

// Snapshot of every value the lifted Gantt-toolbar row needs to render.
// GanttView writes this reactively; GanttToolbarBar (mounted in IssuesView's
// SpaceHeader slot) reads it. Functions are stable references; primitive
// fields are re-set on every reactive update so the bar re-renders correctly.
export interface GanttToolbarSnapshot {
  layoutMode: 'phone' | 'tablet' | 'desktop'
  mobileDrawerOpen: boolean
  toggleMobileDrawer: () => void

  datePickerValue: string
  setDatePickerValue: (v: string) => void
  jumpToStart: () => void
  pageScrollPrev: () => void
  jumpToToday: () => void
  pageScrollNext: () => void
  jumpToEnd: () => void
  jumpToDate: (v: string) => void

  zoomDropdownItems: DropdownIntlItem[]
  zoomDropdownSelection: string
  onZoomDropdownSelected: (e: CustomEvent<any>) => void
  visibleDays: number
  visibleDaysInput: number
  setVisibleDaysInput: (n: number) => void
  applyVisibleDaysInput: () => void
  onVisibleDaysKeyDown: (e: KeyboardEvent) => void

  canUndo: boolean
  canRedo: boolean
  nextUndoDescription: string | null
  nextRedoDescription: string | null
  handleUndo: () => void
  handleRedo: () => void

  ganttGroupBy: GroupByKey
  onGroupBySelectChange: (e: Event) => void

  savedViewModified: boolean
  savedViewName: string
  onUpdateSavedViewClick: () => void

  toggleFullscreen: () => void
  openMoreActionsMenu: (e: MouseEvent) => void

  ariaLabels: Record<string, string>

  ganttBarColorBy: BarColorMode
  onColorBySelectChange: (ev: Event) => void
}

export const ganttToolbarSnapshot = writable<GanttToolbarSnapshot | null>(null)

/**
 * Toolbar tiers that currently do not fit and live behind the "…" trigger.
 *
 * Written by GanttToolbarBar's `cluster` section — the only one that can
 * measure the width the toolbar got — and read by its `trailing` section,
 * which renders the trigger.
 *
 * The trigger deliberately does NOT sit inside the cluster. The cluster is
 * the header row's designated shrink target and legitimately reaches
 * `clientWidth: 0` on a phone-width panel, where the search group cannot even
 * fit its own search input, mode selector and filter button. A trigger inside
 * that box is clipped away and parked outside the viewport — the exact
 * failure the collapse mechanism exists to prevent. Rendered in the frozen
 * `extra` group instead, it keeps its natural width next to the Fullscreen
 * and More-actions buttons, which are reachable at every width by
 * construction.
 */
export const ganttToolbarHiddenTiers = writable<ToolbarTier[]>([])
