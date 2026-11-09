//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Load state of the Phase-2 working-days calendar in GanttView.
 *
 * Calendar-dependent mutations (drag, resize, cascade commits, keyboard
 * shifts) must stay disabled until everything the effective calendar is
 * built from has answered at least once — otherwise a fast interaction
 * could persist dates computed from a half-loaded calendar (weekday mask
 * without holidays, or legacy math for a project that is actually
 * configured). Pure rendering is never gated.
 */
export interface CalendarLoadState {
  /** First response of the per-project config query arrived. */
  projectCfgLoaded: boolean
  /** `workingDaysConfig` is set on the project (false = legacy mode). */
  cfgPresent: boolean
  /** The HR *model* is installed (model-optional runtime integration). */
  hrModelPresent: boolean
  /** First response of the `hr.class.Department` query arrived. */
  departmentsLoaded: boolean
  /** First response of the `hr.class.PublicHoliday` query arrived. */
  holidaysLoaded: boolean
}

export function isCalendarReady (s: CalendarLoadState): boolean {
  if (!s.projectCfgLoaded) return false
  // Legacy mode: no HR data is queried — ready as soon as we KNOW it is legacy.
  if (!s.cfgPresent) return true
  // Config present but no HR model: ready with an empty holiday list.
  if (!s.hrModelPresent) return true
  return s.departmentsLoaded && s.holidaysLoaded
}
