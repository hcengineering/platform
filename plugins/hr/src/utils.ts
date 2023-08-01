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
import { TzDate } from '.'

/**
 * @public
 */
export function toTzDate (date: Date): TzDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    offset: date.getTimezoneOffset()
  }
}

/**
 * @public
 */
export function fromTzDate (tzDate: TzDate): number {
  return new Date().setFullYear(tzDate?.year ?? 0, tzDate.month, tzDate.day)
}

/**
 * @public
 */
export function tzDateEqual (tzDate: TzDate, tzDate2: TzDate): boolean {
  return tzDate.year === tzDate2.year && tzDate.month === tzDate2.month && tzDate.day === tzDate2.day
}

/**
 * @public
 */
export function tzDateCompare (tzDate1: TzDate, tzDate2: TzDate): number {
  if (tzDate1.year === tzDate2.year) {
    if (tzDate1.month === tzDate2.month) {
      return tzDate1.day - tzDate2.day
    } else {
      return tzDate1.month - tzDate2.month
    }
  } else {
    return tzDate1.year - tzDate2.year
  }
}
