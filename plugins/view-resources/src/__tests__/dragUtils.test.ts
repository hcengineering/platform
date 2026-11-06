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

import { isPointInside, isUpperHalf } from '../components/list/dragUtils'

const rect = { top: 100, bottom: 140, left: 0, right: 500 }

describe('list drag utils', () => {
  test('pointer over any part of the group is inside', () => {
    expect(isPointInside(rect, 250, 101)).toBe(true)
    expect(isPointInside(rect, 250, 120)).toBe(true)
    expect(isPointInside(rect, 250, 139)).toBe(true)
  })

  test('pointer on or beyond the group border is outside', () => {
    expect(isPointInside(rect, 250, 100)).toBe(false)
    expect(isPointInside(rect, 250, 140)).toBe(false)
    expect(isPointInside(rect, 250, 90)).toBe(false)
    expect(isPointInside(rect, 250, 160)).toBe(false)
    expect(isPointInside(rect, -1, 120)).toBe(false)
    expect(isPointInside(rect, 500, 120)).toBe(false)
    expect(isPointInside(rect, 0, 0)).toBe(false)
  })

  test('upper half selects the top insert position', () => {
    expect(isUpperHalf(rect, 100)).toBe(true)
    expect(isUpperHalf(rect, 119)).toBe(true)
    expect(isUpperHalf(rect, 120)).toBe(false)
    expect(isUpperHalf(rect, 139)).toBe(false)
  })
})
