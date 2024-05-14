import { expect, type Locator, type Page } from '@playwright/test'

export class ChannelPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly inputMessage = (): Locator => this.page.locator('div[class~="text-editor-view"]')
  readonly buttonSendMessage = (): Locator => this.page.locator('g#Send')
  readonly textMessage = (): Locator => this.page.getByText('Test message')
  readonly channelName = (channel: string): Locator => this.page.getByText('general random').getByText(channel)
  readonly channelTab = (): Locator => this.page.getByRole('link', { name: 'Channels' }).getByRole('button')
  readonly channelTable = (): Locator => this.page.locator('[class="antiTable metaColumn highlightRows"]')

  async sendMessage (message: string): Promise<void> {
    await this.inputMessage().fill(message)
    await this.buttonSendMessage().click()
  }

  async checkMessageExist (message: string): Promise<void> {
    await expect(this.textMessage().filter({ hasText: message })).toBeVisible()
  }

  async clickChannelTab (): Promise<void> {
    await this.channelTab().click()
  }

  async checkIfChannelDefaultExist (shouldExist: boolean, channel: string): Promise<void> {
    if (shouldExist) {
      await expect(this.channelName(channel)).toBeVisible()
    } else {
      await expect(this.channelName(channel)).toBeHidden()
    }
  }

  async checkIfChannelTableExist (): Promise<void> {
    await expect(this.channelTable()).toBeVisible()
  }
}
