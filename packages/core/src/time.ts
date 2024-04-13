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

/**
 * @function getDay
 * 
 * Function to get the start of the day for a given timestamp.
 * 
 * @param {Timestamp} time - The timestamp to get the day for.
 * @returns {Timestamp} The timestamp at the start of the day.
 */
export function getDay (time: Timestamp): Timestamp {
  const date: Date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * @function getDisplayTime
 * 
 * Function to get a displayable string for a given timestamp.
 * 
 * @param {number} time - The timestamp to get the display time for.
 * @returns {string} The displayable time string.
 */
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

/**
 * @function isOtherDay
 * 
 * Function to check if two timestamps are on different days.
 * 
 * @param {Timestamp} time1 - The first timestamp.
 * @param {Timestamp} time2 - The second timestamp.
 * @returns {boolean} Whether the two timestamps are on different days.
 */
export function isOtherDay (time1: Timestamp, time2: Timestamp): boolean {
  return getDay(time1) !== getDay(time2)
}

/**
 * @function isToday
 * 
 * Function to check if a timestamp is on the current day.
 * 
 * @param {number} time - The timestamp to check.
 * @returns {boolean} Whether the timestamp is on the current day.
 */
function isToday (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return (
    current.getDate() === target.getDate() &&
    current.getMonth() === target.getMonth() &&
    current.getFullYear() === target.getFullYear()
  )
}
