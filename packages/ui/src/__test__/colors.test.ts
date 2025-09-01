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

import { getPlatformColorByName, getPlatformAvatarColorByName, avatarWhiteColors, avatarDarkColors } from '../colors'

describe('colors module tests', () => {
  describe('getPlatformColorByName', () => {
    it('get existing color, light theme', () => {
      const result = getPlatformColorByName('Firework', false)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Firework')
      expect(result?.title).toBe('#C03B2F')
    })

    it('get existing color, dark theme', () => {
      const result = getPlatformColorByName('Firework', true)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Firework')
      expect(result?.title).toBe('#FFFFFF')
    })

    it.each([
      { theme: 'light', darkTheme: false },
      { theme: 'dark', darkTheme: true }
    ])('get non-existent color ($theme theme)', ({ darkTheme }) => {
      const result = getPlatformColorByName('NonExistentColor', darkTheme)
      expect(result).toBeUndefined()
    })
  })

  describe('getPlatformAvatarColorByName', () => {
    it.each([
      { theme: 'light', darkTheme: false, expectedPalette: avatarWhiteColors },
      { theme: 'dark', darkTheme: true, expectedPalette: avatarDarkColors }
    ])('get non-existent color ($theme theme)', ({ darkTheme, expectedPalette }) => {
      const result = getPlatformAvatarColorByName('NonExistentAvatarColor', darkTheme)
      const firstColorFromPalette = expectedPalette[0]

      expect(result).toBeDefined()
      expect(result).toEqual(firstColorFromPalette)
    })
  })
})
