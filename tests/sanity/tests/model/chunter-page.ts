import { type Locator, type Page } from '@playwright/test'

export class ChunterPage {
  readonly page: Page
  readonly buttonChannelBrowser: Locator
  readonly buttonNewChannelHeader: Locator
  readonly inputNewChannelName: Locator
  readonly checkboxMakePrivate: Locator
  readonly buttonCreateChannel: Locator
  readonly buttonOpenChannel: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonChannelBrowser = page.locator('span', { hasText: 'Channel browser' })
    this.buttonNewChannelHeader = page.locator('div[class~="ac-header"] button span', { hasText: 'New Channel' })
    this.inputNewChannelName = page.locator('form.antiCard input[type="text"]')
    this.checkboxMakePrivate = page.locator('span.toggle-switch')
    this.buttonCreateChannel = page.locator('button[type="submit"] span', { hasText: 'Create' })
    this.buttonOpenChannel = page.locator('div.antiNav-element__dropbox span.an-element__label')
  }

  async createNewChannel (channelName: string, privateChannel: boolean): Promise<void> {
    await this.inputNewChannelName.fill(channelName)
    if (privateChannel) {
      await this.checkboxMakePrivate.click()
    }
    await this.buttonCreateChannel.click()
  }

  async openChannel (channelName: string): Promise<void> {
    await this.buttonOpenChannel.filter({ hasText: channelName }).click()
  }
}
