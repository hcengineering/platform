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


const DAYS_IN_WEEK = 7
const MILLISECONDS_IN_DAY = 86400000

export function firstDay (date: Date, mondayStart: boolean): Date {
  const firstDayOfMonth = new Date(date)
  firstDayOfMonth.setDate(1) // First day of month
  const result = new Date(firstDayOfMonth)
  result.setDate(
    result.getDate() - result.getDay() + (mondayStart ? 1 : 0)
  )
  // Check if we need add one more week
  if (result.getTime() > firstDayOfMonth.getTime()) {
    result.setDate(result.getDate() - DAYS_IN_WEEK)
  }
  result.setHours(0)
  result.setMinutes(0)
  result.setSeconds(0)
  result.setMilliseconds(0)
  return result
}

export function getWeekDayName (weekDay: Date, weekFormat: 'narrow' | 'short' | 'long' | undefined = 'short'): string {
  const locale = new Intl.NumberFormat().resolvedOptions().locale
  return new Intl.DateTimeFormat(locale, {
    weekday: weekFormat
  }).format(weekDay)
}

export function day (firstDay: Date, offset: number): Date {
  return new Date(firstDay.getTime() + offset * MILLISECONDS_IN_DAY)
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

export function getMonthName (date: Date): string {
  const locale = new Intl.NumberFormat().resolvedOptions().locale
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
}
