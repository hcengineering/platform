//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Doc, type Ref } from '@hcengineering/core'
import { type Department } from '@hcengineering/hr'
import { type WorkingDaysConfig } from '@hcengineering/tracker'
import { deepEqual } from 'fast-equals'

/** Mon-Fri — bit 0 = Mon … bit 6 = Sun, see `WorkingDaysConfig.weekdayMask`. */
export const DEFAULT_WEEKDAY_MASK = 0b0011111

export function isWeekdayActive (mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0
}

/**
 * Toggle one weekday bit. Refuses to clear the last active day: the
 * scheduler needs at least one working day per week, otherwise "next
 * working day" would never terminate.
 */
export function toggleWeekdayBit (mask: number, bit: number): number {
  const next = mask ^ (1 << bit)
  return next === 0 ? mask : next
}

/** True when `bit` is the only active day — its toggle renders disabled. */
export function isLastActiveWeekday (mask: number, bit: number): boolean {
  return mask === 1 << bit
}

/**
 * Dropdown items for the holiday-department selector: every department
 * except the root (the root is represented by the prepended "company-wide"
 * entry in the component), sorted by name. Pure so it is unit-testable
 * without a component harness.
 */
export function departmentItems (
  departments: Department[],
  head: Ref<Department>
): Array<{ id: string, label: string }> {
  return departments
    .filter((d) => d._id !== head)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({ id: d._id as unknown as string, label: d.name }))
}

/** `undefined` disables working-days mode; enabling starts from Mon-Fri. */
export function enableWorkingDays (on: boolean): WorkingDaysConfig | undefined {
  return on ? { weekdayMask: DEFAULT_WEEKDAY_MASK } : undefined
}

/**
 * Apply a department selection to the config. The company-wide entry
 * REMOVES the key (delete, not an `undefined` assignment): a present-but-
 * undefined key would still surface in serialization and diffing.
 */
export function applyDepartmentSelection (
  value: WorkingDaysConfig,
  id: string,
  companyWideId: string
): WorkingDaysConfig {
  if (id === companyWideId) {
    const next = { ...value }
    delete next.holidayDepartment
    return next
  }
  return { ...value, holidayDepartment: id as unknown as Ref<Doc> }
}

/**
 * Compute the host dialog's update fragment for `workingDaysConfig`.
 * Returns `undefined` when nothing changed. Disabling must `$unset` the
 * field — writing `undefined` could be stored as null, which would
 * masquerade as a configured calendar downstream.
 */
export function workingDaysUpdate (
  next: WorkingDaysConfig | undefined,
  previous: WorkingDaysConfig | undefined
): { workingDaysConfig: WorkingDaysConfig } | { $unset: { workingDaysConfig: true } } | undefined {
  if (deepEqual(next, previous)) return undefined
  if (next === undefined) return { $unset: { workingDaysConfig: true } }
  return { workingDaysConfig: next }
}
