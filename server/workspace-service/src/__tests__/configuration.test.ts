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

import { shouldRunInitScript } from '../configuration'

describe('shouldRunInitScript', () => {
  test('returns true when configuration is null (legacy default)', () => {
    expect(shouldRunInitScript(null)).toBe(true)
  })

  test('returns true when configuration is undefined (legacy default)', () => {
    expect(shouldRunInitScript(undefined)).toBe(true)
  })

  test('returns true when withDemoContent is unspecified', () => {
    expect(shouldRunInitScript({})).toBe(true)
  })

  test('returns true when withDemoContent is explicitly true', () => {
    expect(shouldRunInitScript({ withDemoContent: true })).toBe(true)
  })

  test('returns false only when withDemoContent is explicitly false', () => {
    expect(shouldRunInitScript({ withDemoContent: false })).toBe(false)
  })
})
