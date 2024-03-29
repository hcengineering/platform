import { type Locator, type Page } from '@playwright/test'

export class ChunterPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly buttonChannelBrowser = (): Locator => this.page.locator('.header > .antiButton')
  readonly buttonNewChannelHeader = (): Locator => this.page.getByRole('button', { name: 'New channel' })
  readonly inputNewChannelName = (): Locator => this.page.getByPlaceholder('New channel')
  readonly inputDescription = (): Locator => this.page.getByPlaceholder('Description (optional)')
  readonly checkboxMakePublic = (): Locator => this.page.getByRole('button', { name: 'Public' })
  readonly checkboxMakePrivate = (): Locator => this.page.getByRole('button', { name: 'Private' })
  readonly buttonCreateChannel = (): Locator => this.page.getByRole('button', { name: 'Create' })
  readonly buttonOpenChannel = (): Locator => this.page.locator('div.antiNav-element__dropbox span.an-element__label')

  async clickChannelBrowser (): Promise<void> {
    await this.buttonChannelBrowser().click()
  }

  async clickNewChannelHeader (): Promise<void> {
    await this.buttonNewChannelHeader().click()
  }

  async createPrivateChannel (channelName: string, privateChannel: boolean): Promise<void> {
    await this.inputNewChannelName().fill(channelName)
    if (privateChannel) {
      await this.checkboxMakePublic().click()
      await this.checkboxMakePrivate().click()
    }
    await this.buttonCreateChannel().click()
  }

  async openChannel (channelName: string): Promise<void> {
    await this.buttonOpenChannel().filter({ hasText: channelName }).click()
  }
}
