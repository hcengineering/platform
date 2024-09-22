import { expect, Page } from '@playwright/test'
import { join } from 'path'

export class VisualCheck {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  async compareScreenshot (selector: string | null, screenshotName: string): Promise<void> {
    let screenshot

    if (selector !== null && selector !== undefined) {
      const element = this.page.locator(selector)
      await expect(element).toBeVisible()
      screenshot = await element.screenshot()
    } else {
      screenshot = await this.page.screenshot()
    }

    // Compare the screenshot with the stored snapshot
    expect(screenshot).toMatchSnapshot(join(__dirname, '..', 'screenshots', `${screenshotName}.png`), {
      maxDiffPixelRatio: 0.2
    })
  }

  async comparePDFPreview (screenshotName: string): Promise<void> {
    // Wait for the iframe to be present in the DOM
    const iframe = this.page.locator('iframe.pdfviewer-content')
    await iframe.waitFor({ state: 'attached', timeout: 10000 })

    // Wait for the iframe to finish loading
    await this.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe.pdfviewer-content') as HTMLIFrameElement
        return iframe?.contentDocument?.readyState === 'complete'
      },
      { timeout: 30000 }
    )

    const pdfPreviewModal = this.page.locator('.antiDialog > .content')
    await expect(pdfPreviewModal).toBeVisible()

    const screenshot = await this.page.screenshot()

    expect(screenshot).toMatchSnapshot(join(__dirname, '..', 'screenshots', `${screenshotName}.png`), {
      maxDiffPixelRatio: 0.2
    })
  }
}
