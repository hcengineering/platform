//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Project } from '@hcengineering/tracker'

/** Hours in a working day when the project does not configure `hoursPerDay`. */
export const DEFAULT_HOURS_PER_DAY = 8

const MINUTES_PER_HOUR = 60

/**
 * Normalizes a user-entered hours-per-day value: anything that is not a
 * number in (0, 24] counts as "not configured" (`undefined`).
 */
export function normalizeHoursPerDay (value: number | null | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 24) return undefined
  return value
}

/** Hours in a working day for the given project, falling back to {@link DEFAULT_HOURS_PER_DAY}. */
export function getHoursPerDay (project: Pick<Project, 'hoursPerDay'> | undefined): number {
  return normalizeHoursPerDay(project?.hoursPerDay) ?? DEFAULT_HOURS_PER_DAY
}

export interface TimeParts {
  days: number
  hours: number
  minutes: number
}

/**
 * Splits a time value stored in hours into working days, hours and minutes.
 * Computed on whole minutes so fractional day lengths (e.g. 7.5h) and
 * rounding (e.g. 0.999h) never yield "60m" or a fractional hour.
 */
export function splitTime (value: number, hoursPerDay: number = DEFAULT_HOURS_PER_DAY): TimeParts {
  const total = Math.round(value * MINUTES_PER_HOUR)
  if (!Number.isFinite(total) || total <= 0) return { days: 0, hours: 0, minutes: 0 }
  const minutesPerDay = Math.round((normalizeHoursPerDay(hoursPerDay) ?? DEFAULT_HOURS_PER_DAY) * MINUTES_PER_HOUR)
  const days = Math.floor(total / minutesPerDay)
  const rest = total - days * minutesPerDay
  return { days, hours: Math.floor(rest / MINUTES_PER_HOUR), minutes: rest % MINUTES_PER_HOUR }
}

/**
 * Project update for a changed hours-per-day setting: `undefined` when
 * nothing changed, `$unset` when the setting was cleared (never write
 * `undefined`), the new value otherwise.
 */
export function hoursPerDayUpdate (
  next: number | null | undefined,
  prev: number | undefined
): { hoursPerDay: number } | { $unset: { hoursPerDay: true } } | undefined {
  const value = normalizeHoursPerDay(next)
  if (value === prev) return undefined
  return value === undefined ? { $unset: { hoursPerDay: true } } : { hoursPerDay: value }
}
