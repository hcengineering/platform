import { expect, type Locator, type Page } from '@playwright/test'

export class ChannelPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly inputMessage = (): Locator => this.page.locator('div[class~="text-editor-view"]')
  readonly buttonSendMessage = (): Locator => this.page.locator('g#Send')
  readonly textMessage = (): Locator => this.page.getByText('Test message')

  async sendMessage (message: string): Promise<void> {
    await this.inputMessage().fill(message)
    await this.buttonSendMessage().click()
  }

  async checkMessageExist (message: string): Promise<void> {
    await expect(this.textMessage().filter({ hasText: message })).toBeVisible()
  }
}
