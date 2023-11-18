import { expect, type Locator, type Page } from '@playwright/test'

export class ChannelPage {
  readonly page: Page
  readonly inputMessage: Locator
  readonly buttonSendMessage: Locator
  readonly textMessage: Locator

  constructor (page: Page) {
    this.page = page
    this.inputMessage = page.locator('div[class~="text-editor-view"]')
    this.buttonSendMessage = page.locator('g#Send')
    this.textMessage = page.locator('div.message > div.text')
  }

  async sendMessage (message: string): Promise<void> {
    await this.inputMessage.fill(message)
    await this.buttonSendMessage.click()
  }

  async checkMessageExist (message: string): Promise<void> {
    await expect(this.textMessage.filter({ hasText: message })).toBeVisible()
  }
}
