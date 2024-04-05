import { type Locator, type Page } from '@playwright/test'

export class ChunterPage {
  readonly page: Page
  readonly buttonChannelBrowser: Locator
  readonly buttonPlusSign: Locator
  readonly buttonNewChannelHeader: Locator
  readonly inputNewChannelName: Locator
  readonly checkboxMakePrivate: Locator
  readonly buttonChannelType: Locator
  readonly buttonCreateChannel: Locator
  readonly buttonOpenChannel: Locator
  readonly buttonPrivateChannelType: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonChannelBrowser = page.locator('span', { hasText: 'Channel browser' })
    this.buttonNewChannelHeader = page.locator('button span', { hasText: 'New channel' })
    this.inputNewChannelName = page.locator('input.font-regular-14')
    this.checkboxMakePrivate = page.locator('span.toggle-switch')
    this.buttonCreateChannel = page.locator('button span', { hasText: 'Create' })
    this.buttonOpenChannel = page.locator('span.label.overflow-label')
    this.buttonPlusSign = page.locator('button.antiButton.primary')
    this.buttonChannelType = page.locator('button.font-medium-14.secondary.medium.type-button.svelte-i3hlsl.menu')
    this.buttonPrivateChannelType = page.locator('div.hulyPopup-row__label', {hasText: 'Private'})
  }

  async createNewChannel (channelName: string, privateChannel: boolean): Promise<void> {
    await this.inputNewChannelName.fill(channelName)
    if (privateChannel) {
      //await this.checkboxMakePrivate.click()
      await this.buttonChannelType.click()
      await this.buttonPrivateChannelType.click()

    }
    await this.buttonCreateChannel.click()
  }

  async openChannel (channelName: string): Promise<void> {
    await this.buttonOpenChannel.filter({ hasText: channelName }).click()
  }
}
