import { expect, type Locator, type Page } from '@playwright/test'

export class ChannelPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly inputMessage = (): Locator => this.page.locator('div[class~="text-editor-view"]')
  readonly buttonSendMessage = (): Locator => this.page.locator('g#Send')
  readonly textMessage = (messageText: string): Locator => this.page.getByText(messageText)
  readonly channelName = (channel: string): Locator => this.page.getByText('general random').getByText(channel)
  readonly channelTab = (): Locator => this.page.getByRole('link', { name: 'Channels' }).getByRole('button')
  readonly channelTable = (): Locator => this.page.locator('[class="antiTable metaColumn highlightRows"]')
  readonly channel = (channel: string): Locator => this.page.getByRole('button', { name: channel })
  readonly chooseChannel = (channel: string): Locator => this.page.getByRole('link', { name: channel })
  readonly closePopupWindow = (): Locator => this.page.locator('.root > div > .antiButton').first()
  readonly openAddMemberToChannel = (userName: string): Locator => this.page.getByRole('button', { name: userName })
  readonly addMemberToChannelButton = (userName: string): Locator => this.page.getByRole('button', { name: userName })
  readonly joinChannelButton = (): Locator => this.page.getByRole('button', { name: 'Join' })

  async sendMessage (message: string): Promise<void> {
    await this.inputMessage().fill(message)
    await this.buttonSendMessage().click()
  }

  async clickChannel (channel: string): Promise<void> {
    await this.channel(channel).click()
  }

  async clickChooseChannel (channel: string): Promise<void> {
    await this.chooseChannel(channel).click({ force: true })
  }

  async checkMessageExist (message: string, messageExists: boolean, messageText: string): Promise<void> {
    if (messageExists) {
      await expect(this.textMessage(messageText).filter({ hasText: message })).toBeVisible()
    } else {
      await expect(this.textMessage(messageText).filter({ hasText: message })).toBeHidden()
    }
  }

  async clickChannelTab (): Promise<void> {
    await this.channelTab().click()
  }

  async clickOnClosePopupButton (): Promise<void> {
    await this.closePopupWindow().click()
  }

  async clickOnUser (user: string): Promise<void> {
    await this.addMemberToChannelButton(user).click()
  }

  async addMemberToChannel (user: string): Promise<void> {
    await this.openAddMemberToChannel(user).click()
  }

  async clickJoinChannelButton (): Promise<void> {
    await this.joinChannelButton().click()
  }

  async checkIfChannelDefaultExist (shouldExist: boolean, channel: string): Promise<void> {
    if (shouldExist) {
      await expect(this.channelName(channel)).toBeVisible()
    } else {
      await expect(this.channelName(channel)).toBeHidden()
    }
  }

  async checkIfChannelTableExist (channel: string, publicChannel: boolean): Promise<void> {
    if (publicChannel) {
      await expect(this.channelTable()).toBeVisible()
      await expect(this.channelTable()).toContainText(channel)
    } else {
      await expect(this.channelTable()).not.toContainText(channel)
    }
  }

  async checkIfMessageExist (messageExists: boolean, messageText: string): Promise<void> {
    if (messageExists) {
      await expect(this.textMessage(messageText)).toBeVisible()
    } else {
      await expect(this.textMessage(messageText)).toBeHidden()
    }
  }
}
