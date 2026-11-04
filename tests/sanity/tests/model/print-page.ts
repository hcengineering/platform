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

import { expect, type Locator, type Page } from '@playwright/test'

export class PrintPage {
  constructor (readonly page: Page) {}

  readonly root = (): Locator => this.page.locator('[data-print-root]')
  readonly documentImage = (): Locator => this.root().locator('.text-editor-image-container img')

  static objectUrl (workbenchUrl: string, objectClass: string): string {
    const url = new URL(workbenchUrl)
    const segments = url.pathname.split('/')
    const workspace = segments[2]
    const objectId = segments[4]?.split('-').pop()
    if (workspace === undefined || objectId === undefined || objectId === '') {
      throw new Error('Expected an opened object URL')
    }
    url.pathname = `/print/${workspace}`
    url.search = new URLSearchParams({ objectClass, objectId }).toString()
    url.hash = ''
    return url.toString()
  }

  async open (workbenchUrl: string, objectClass: string = 'document:class:Document'): Promise<void> {
    await this.page.goto(PrintPage.objectUrl(workbenchUrl, objectClass))
    await expect(this.root()).toBeVisible({ timeout: 120000 })
    await expect(this.root()).toHaveAttribute('data-print-state', 'ready', { timeout: 60000 })
  }

  async checkReadOnly (): Promise<void> {
    await expect(this.root().locator('[contenteditable="true"]')).toHaveCount(0)
    await expect(this.root().locator('.textInput .tiptap')).toHaveAttribute('contenteditable', 'false')
  }

  async checkImageLoaded (image: Locator): Promise<void> {
    await expect(image).toBeVisible()
    await expect
      .poll(
        async () => await image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
      )
      .toBe(true)
  }

  async checkPdfPreview (title: string): Promise<void> {
    const preview = this.page.locator(`iframe[title*="${title}"][title$=".pdf"]`)
    await expect(preview).toBeVisible({ timeout: 120000 })
    const url = await preview.getAttribute('src')
    if (url === null) throw new Error('The PDF preview has no file URL')
    const response = await this.page.request.get(url)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('application/pdf')
    const bytes = await response.body()
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  }
}
