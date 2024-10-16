import { type Locator, type Page, expect } from '@playwright/test'

export class PdfPages {
  readonly page: Page
  readonly printToPdf: Locator
  readonly printToPdfHeader: Locator
  readonly downloadPdf: Locator
  readonly showFullScreenPdf: Locator

  constructor (page: Page) {
    this.page = page
    this.printToPdf = page.getByRole('button', { name: 'Print to PDF' })
    this.printToPdfHeader = page.getByText('PDF PDF print preview')
    this.downloadPdf = page.locator('form').getByRole('link').getByRole('button')
    this.showFullScreenPdf = page.locator('form').getByRole('button').nth(2)
  }

  async printToPdfClick (): Promise<void> {
    await this.printToPdf.click()
    await expect(this.printToPdfHeader).toBeVisible()
  }

  async showFullScreenPdfClick (): Promise<void> {
    await this.showFullScreenPdf.click()
  }

  async downloadAndVerifyPdf (): Promise<void> {
    const [download] = await Promise.all([this.page.waitForEvent('download'), this.downloadPdf.click()])
    const filePath = await download.path()
    expect(filePath).toBeTruthy()
    const fileName = download.suggestedFilename()
    console.log(`Downloaded file: ${fileName}`)
  }
}
