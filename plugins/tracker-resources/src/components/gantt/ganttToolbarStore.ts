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
}

export const ganttToolbarSnapshot = writable<GanttToolbarSnapshot | null>(null)
