//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { writable } from 'svelte/store'
import type { ZoomLevel } from './types'

// Phase 2 — toolbar consolidation. The Gantt's date-navigation +
// zoom buttons used to live inside GanttView itself, in a dedicated
// row above the canvas. UX feedback (2026-05-14): that row eats
// vertical space and visually duplicates the Filter/Search row above.
//
// We move the buttons INTO IssuesView's `header-tools` slot so they
// share the row with Filter + Search + ViewletSetting. Because
// IssuesView and GanttView are separated by `ViewletContentView`
// (which dynamically picks the active viewlet component), the two
// components can't pass props directly. Instead, GanttView registers
// its toolbar API into this writable store on mount; IssuesView reads
// from the store inside the header-tools slot.
//
// The "API" pattern is intentional — exposing imperative functions
// (jumpToToday, setZoom, ...) is simpler than mirroring the full
// internal Svelte state into the store reactively. Each setter takes
// the parameter and dispatches into GanttView's local handlers.
//
// On GanttView unmount we set the store to null so any leftover
// toolbar consumer renders nothing.

export interface GanttToolbarApi {
  zoom: ZoomLevel
  datePickerValue: string
  setZoom: (z: ZoomLevel) => void
  jumpToToday: () => void
  jumpToStart: () => void
  jumpToEnd: () => void
  pageScroll: (dir: -1 | 1) => void
  jumpToDate: (iso: string) => void
  cycleZoom: (delta: number) => void
  toggleFullscreen: () => void
  exportToPng: () => void
  exportToPdf: () => void
}

export const ganttToolbarApi = writable<GanttToolbarApi | null>(null)
