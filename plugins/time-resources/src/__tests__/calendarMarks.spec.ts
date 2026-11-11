//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Ref, Space } from '@hcengineering/core'

import { getDayStart, getMarkedDays, getMonthRange } from '../calendarMarks'

const at = (month: number, day: number, hours: number = 0, minutes: number = 0): number =>
  new Date(2025, month, day, hours, minutes).getTime()

describe('getMonthRange', () => {
  it('covers the whole local month', () => {
    expect(getMonthRange(new Date(2025, 1, 14, 15))).toEqual({ from: at(1, 1), to: at(2, 1) })
  })

  it('wraps over the year end', () => {
    expect(getMonthRange(new Date(2025, 11, 31))).toEqual({ from: at(11, 1), to: new Date(2026, 0, 1).getTime() })
  })
})

describe('getMarkedDays', () => {
  const { from, to } = getMonthRange(new Date(2025, 1, 1))
  const none = new Set<Ref<Space>>()

  it('marks the day of a point in time', () => {
    expect(getMarkedDays([{ date: at(1, 10, 17, 30) }], from, to, none)).toEqual(new Set([at(1, 10)]))
  })

  it('marks every day an interval covers, end exclusive', () => {
    const items = [
      { date: at(1, 3, 10), dueDate: at(1, 3, 10, 30) },
      { date: at(1, 5, 22), dueDate: at(1, 7, 0) }
    ]
    expect(getMarkedDays(items, from, to, none)).toEqual(new Set([at(1, 3), at(1, 5), at(1, 6)]))
  })

  it('clips items to the range', () => {
    const items = [
      { date: at(0, 31, 12) },
      { date: at(0, 31, 22), dueDate: at(1, 1, 2) },
      { date: at(1, 28, 22), dueDate: at(2, 1, 2) },
      { date: at(2, 1, 12) }
    ]
    expect(getMarkedDays(items, from, to, none)).toEqual(new Set([at(1, 1), at(1, 28)]))
  })

  it('ignores items of archived spaces', () => {
    const archived = 'archived' as Ref<Space>
    const active = 'active' as Ref<Space>
    const items = [{ date: at(1, 2), space: archived }, { date: at(1, 3), space: active }, { date: at(1, 4) }]
    expect(getMarkedDays(items, from, to, new Set([archived]))).toEqual(new Set([at(1, 3), at(1, 4)]))
  })

  it('returns local day starts', () => {
    expect(getDayStart(at(1, 10, 23, 59))).toBe(at(1, 10))
  })
})
