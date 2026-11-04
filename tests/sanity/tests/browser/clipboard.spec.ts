//
// Copyright © 2026 TraceX SAS.
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

import { expect, test } from '@playwright/test'
import { PlatformURI } from '../utils'

test('exposes the Clipboard API on the application origin', async ({ page }) => {
  const url = new URL('/__browser-test__/clipboard', PlatformURI).toString()
  await page.route(url, async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Clipboard test</title>' })
  })
  await page.goto(url)

  const capabilities = await page.evaluate(() => ({
    secureContext: window.isSecureContext,
    readText: typeof navigator.clipboard?.readText
  }))
  expect(capabilities).toEqual({ secureContext: true, readText: 'function' })
})
