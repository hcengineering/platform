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

import { isChannelNameTaken, normalizeChannelName } from '../channelName'

describe('normalizeChannelName', () => {
  it('trims and lower-cases the name', () => {
    expect(normalizeChannelName('  General ')).toBe('general')
  })
})

describe('isChannelNameTaken', () => {
  const existing = ['general', 'Random', undefined]

  it('detects an exact duplicate', () => {
    expect(isChannelNameTaken('general', existing)).toBe(true)
  })

  it('ignores letter case and surrounding whitespace', () => {
    expect(isChannelNameTaken('  GENERAL ', existing)).toBe(true)
    expect(isChannelNameTaken('random', existing)).toBe(true)
  })

  it('accepts a new name', () => {
    expect(isChannelNameTaken('general-2', existing)).toBe(false)
  })

  it('does not report empty names as taken', () => {
    expect(isChannelNameTaken('', ['', 'general'])).toBe(false)
    expect(isChannelNameTaken('   ', [' '])).toBe(false)
  })

  it('accepts any name when there are no channels', () => {
    expect(isChannelNameTaken('general', [])).toBe(false)
  })
})
