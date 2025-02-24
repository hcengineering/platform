//
// Copyright © 2023 Hardcore Engineering Inc.
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
//
import { Timestamp } from './classes'

export function getDay (time: Timestamp): Timestamp {
  const date: Date = new Date(time)
  return convertToDay(date).getTime()
}

export function convertToDay (date: Date): Date {
  const originalDay: number = date.getDate()
  const convertedDate: Date = new Date(date)
  // Set 12 AM UTC time, since it will be the same day in most timezones
  convertedDate.setUTCHours(12, 0, 0, 0)
  if (convertedDate.getDate() !== originalDay) {
    convertedDate.setDate(originalDay)
  }
  return convertedDate
}

export function getHour (time: Timestamp): Timestamp {
  const date: Date = new Date(time)
  date.setMinutes(0, 0, 0)
  return date.getTime()
}

export function getDisplayTime (time: number): string {
  let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  if (!isToday(time)) {
    options = {
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  }

  return new Date(time).toLocaleString('default', options)
}

export function isOtherDay (time1: Timestamp, time2: Timestamp): boolean {
  return getDay(time1) !== getDay(time2)
}

export function isOtherHour (time1: Timestamp, time2: Timestamp): boolean {
  return getHour(time1) !== getHour(time2)
}

function isToday (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return (
    current.getDate() === target.getDate() &&
    current.getMonth() === target.getMonth() &&
    current.getFullYear() === target.getFullYear()
  )
}
