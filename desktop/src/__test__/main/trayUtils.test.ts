//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { getBadgeIconInfo } from '../../main/trayUtils'

describe('getBadgeIconInfo', () => {
  const baseTitle = 'Huly'

  it('count of 0', () => {
    const result = getBadgeIconInfo(0, baseTitle)
    expect(result).toEqual({
      fileName: '',
      tooltip: baseTitle
    })
  })

  it('negative count', () => {
    const result = getBadgeIconInfo(-5, baseTitle)
    expect(result).toEqual({
      fileName: '',
      tooltip: baseTitle
    })
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('count of %i', (count: number) => {
    const result = getBadgeIconInfo(count, baseTitle)
    expect(result).toEqual({
      fileName: `app_icon_badge_0${count}.png`,
      tooltip: `${baseTitle}: ${count} unread`
    })
  })

  describe('badge count 10-98', () => {
    const testCases: number[] = []
    for (let i = 10; i <= 98; i++) {
      testCases.push(i)
    }

    it.each(testCases)('count of %i', (count: number) => {
      const result = getBadgeIconInfo(count, baseTitle)
      expect(result).toEqual({
        fileName: `app_icon_badge_${count}.png`,
        tooltip: `${baseTitle}: ${count} unread`
      })
    })
  })

  it.each([99, 100, 200, 301])('count of %i', (count: number) => {
    const result = getBadgeIconInfo(count, baseTitle)
    expect(result).toEqual({
      fileName: 'app_icon_badge_99plus.png',
      tooltip: `${baseTitle}: ${count} unread`
    })
  })
})
