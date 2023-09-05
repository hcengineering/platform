// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

export const DAYS_IN_WEEK = 7

export const MILLISECONDS_IN_MINUTE = 60000
export const MILLISECONDS_IN_DAY = 86400000
export const MILLISECONDS_IN_WEEK = DAYS_IN_WEEK * MILLISECONDS_IN_DAY

export function firstDay (date: Date, mondayStart: boolean): Date {
  const firstDayOfMonth = new Date(new Date(date).setHours(0, 0, 0, 0))
  firstDayOfMonth.setDate(1) // First day of month
  const result = new Date(firstDayOfMonth)
  result.setDate(result.getDate() - result.getDay() + (mondayStart ? 1 : 0))
  // Check if we need add one more week
  if (result.getTime() > firstDayOfMonth.getTime()) {
    result.setDate(result.getDate() - DAYS_IN_WEEK)
  }
  return result
}

export function getWeek (date: Date): number {
  const onejan = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - onejan.getTime()) / MILLISECONDS_IN_DAY + onejan.getDay() + 1) / DAYS_IN_WEEK)
}

export function daysInMonth (date: Date): number {
  return 33 - new Date(date.getFullYear(), date.getMonth(), 33).getDate()
}

export function getWeekDayName (weekDay: Date, weekFormat: 'narrow' | 'short' | 'long' | undefined = 'short'): string {
  const locale = new Intl.NumberFormat().resolvedOptions().locale
  return new Intl.DateTimeFormat(locale, {
    weekday: weekFormat
  }).format(weekDay)
}

export function day (firstDay: Date, offset: number, minutes?: number): Date {
  return new Date(firstDay.getTime() + offset * MILLISECONDS_IN_DAY + (minutes ?? 0) * MILLISECONDS_IN_MINUTE)
}

export function weekday (firstDay: Date, w: number, d: number): Date {
  return day(firstDay, w * DAYS_IN_WEEK + d)
}

export function areDatesEqual (firstDate: Date | undefined, secondDate: Date | undefined): boolean {
  if (firstDate === undefined || secondDate === undefined) {
    return false
  }
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

export function isWeekend (date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6
}

export function getMonthName (date: Date, option: 'narrow' | 'short' | 'long' | 'numeric' | '2-digit' = 'long'): string {
  try {
    const locale = new Intl.NumberFormat().resolvedOptions().locale
    return new Intl.DateTimeFormat(locale, { month: option }).format(date)
  } catch (err) {
    console.error(err)
    return ''
  }
}

export type TCellStyle = 'not-selected' | 'selected'
export interface ICell {
  dayOfWeek: number
  style: TCellStyle
}

export function getMonday (d: Date, mondayStart: boolean): Date {
  d = new Date(new Date(d).setHours(0, 0, 0, 0))
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

export function addZero (value: number): string {
  if (value < 10) {
    return `0${value}`
  }
  return `${value}`
}

export const getDaysDifference = (from: Date, to: Date): number => {
  const firstDateMs = from.setHours(0, 0, 0, 0)
  const secondDateMs = to.setHours(0, 0, 0, 0)

  return Math.round(Math.abs(secondDateMs - firstDateMs) / MILLISECONDS_IN_DAY)
}

export const getMillisecondsInMonth = (date: Date): number => {
  return daysInMonth(date) * MILLISECONDS_IN_DAY
}

const WARNING_DAYS = 7

export const getDueDateIconModifier = (
  isOverdue: boolean,
  daysDifference: number | null,
  shouldIgnoreOverdue: boolean
): 'overdue' | 'critical' | 'warning' | 'normal' => {
  if (shouldIgnoreOverdue) return 'normal'
  if (isOverdue) return 'overdue'
  if (daysDifference === 0) return 'critical'
  if (daysDifference !== null && daysDifference <= WARNING_DAYS) return 'warning'
  return 'normal'
}

export function getFormattedDate (value: number | null): string {
  return value === null ? '' : new Date(value).toLocaleString('default', { month: 'short', day: 'numeric' })
}
