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

import { isDesktopClient } from './desktop'

describe('isDesktopClient', () => {
  const globalAny = globalThis as any
  const originalWindow = globalAny.window

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalAny.window
    } else {
      globalAny.window = originalWindow
    }
  })

  it('returns false in a regular https browser context', () => {
    globalAny.window = {
      location: { protocol: 'https:' }
    }
    expect(isDesktopClient()).toBe(false)
  })

  it('returns false when window is undefined (SSR / node)', () => {
    delete globalAny.window
    expect(isDesktopClient()).toBe(false)
  })

  it('returns true when the Electron IPC bridge is exposed on window', () => {
    // The desktop preload script exposes the IPC bridge as `window.electron`
    // (see desktop/src/ui/typesUtils.ts).
    globalAny.window = {
      electron: { sendNotification: jest.fn() },
      // protocol is still https here — bridge alone must be enough
      location: { protocol: 'https:' }
    }
    expect(isDesktopClient()).toBe(true)
  })

  it('returns true when the page is loaded from file:// (matches the failing scope in the bug report)', () => {
    // The reported error showed scope `file:///workbench/n3-…` and script
    // `file:///serviceWorker.js`. The file: protocol alone should disable
    // push registration even if the bridge isn't visible yet.
    globalAny.window = {
      location: { protocol: 'file:' }
    }
    expect(isDesktopClient()).toBe(true)
  })

  it('treats a null electron property as not-a-bridge', () => {
    globalAny.window = {
      electron: null,
      location: { protocol: 'https:' }
    }
    expect(isDesktopClient()).toBe(false)
  })
})
