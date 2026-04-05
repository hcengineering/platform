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

import * as nodePath from 'path'
import { getBundledUiDistPath, getFileInPublicBundledFolder } from '../../main/path'

const mockGetAppPath = jest.fn(() => '/mock/appPath')

jest.mock('electron', () => ({
  app: {
    getAppPath: (): string => mockGetAppPath()
  }
}))

describe('path (bundled UI)', () => {
  beforeEach(() => {
    mockGetAppPath.mockReturnValue('/mock/appPath')
  })

  test('getBundledUiDistPath joins getAppPath with dist/ui', () => {
    mockGetAppPath.mockReturnValue('/Applications/Huly.app/Contents/Resources/app.asar')
    expect(getBundledUiDistPath()).toBe(
      nodePath.join('/Applications/Huly.app/Contents/Resources/app.asar', 'dist', 'ui')
    )
  })

  test('getFileInPublicBundledFolder nests under public', () => {
    mockGetAppPath.mockReturnValue('/repo/desktop')
    expect(getFileInPublicBundledFolder('AppIcon.png')).toBe(
      nodePath.join('/repo/desktop', 'dist', 'ui', 'public', 'AppIcon.png')
    )
  })
})
