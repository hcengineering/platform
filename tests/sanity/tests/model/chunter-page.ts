import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'

export class ChunterPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly buttonChannelBrowser = (): Locator => this.page.locator('.hulyNavPanel-header > button.type-button-icon')
  readonly buttonNewChannelHeader = (): Locator => this.page.getByRole('button', { name: 'New channel' })
  readonly inputNewChannelName = (): Locator => this.page.getByPlaceholder('New channel')
  readonly inputDescription = (): Locator => this.page.getByPlaceholder('Description (optional)')
  readonly checkboxMakePublic = (): Locator => this.page.getByRole('button', { name: 'Public' })
  readonly checkboxMakePrivate = (): Locator => this.page.getByRole('button', { name: 'Private' })
  readonly buttonCreateChannel = (): Locator => this.page.getByRole('button', { name: 'Create' })
  readonly buttonOpenChannel = (): Locator => this.page.locator('div.antiNav-element__dropbox span.an-element__label')
  readonly channelContainers = (): Locator => this.page.locator('.hulyNavItem-container')
  readonly starredChannelContainers = (): Locator => this.page.locator('#navGroup-starred').locator('.hulyNavItem-container')

  // ACTIONS

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
  
  async makeActionWithChannel (channelName: string, action: string): Promise<void> {
    await this.channelContainers().filter({ hasText: channelName }).hover()
    await this.channelContainers()
      .filter({ hasText: channelName })
      .locator('.hulyNavItem-actions')
      .click()
    await this.selectFromDropdown(this.page, action)
  }
  
  async checkChannelStarred (shouldExist: boolean, channelName: string): Promise<void> {
    if (shouldExist) {
      await expect(this.starredChannelContainers().filter({ hasText: channelName })).toHaveCount(1)
    } else {
      await expect(this.starredChannelContainers().filter({ hasText: channelName })).toHaveCount(0)
    }
  }
}
