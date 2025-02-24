import { expect, type Locator, type Page } from '@playwright/test'
import { SignUpData } from './common-types'

export class ChunterPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  readonly buttonChannelBrowser = (): Locator => this.page.locator('.hulyNavPanel-header > button.type-button-icon')
  readonly buttonNewChannelHeader = (): Locator => this.page.getByRole('button', { name: 'New channel' })
  readonly buttonNewDirectChatHeader = (): Locator => this.page.getByRole('button', { name: 'New direct chat' })
  readonly inputNewChannelName = (): Locator => this.page.getByPlaceholder('New channel')
  readonly inputDescription = (): Locator => this.page.getByPlaceholder('Description (optional)')
  readonly checkboxMakePublic = (): Locator => this.page.getByRole('button', { name: 'Public' })
  readonly checkboxMakePrivate = (): Locator => this.page.getByRole('button', { name: 'Private' })
  readonly buttonCreateChannel = (): Locator => this.page.getByRole('button', { name: 'Create', exact: true })
  readonly buttonOpenChannel = (): Locator => this.page.locator('div.antiNav-element__dropbox span.an-element__label')
  readonly inputNewDirectChatEmployee = (): Locator => this.page.locator('.popup input[placeholder="Search..."]')
  readonly rowEmployeeInNewDirectChatModal = (): Locator => this.page.locator('.popup .users button.row')
  readonly buttonNewDirectChatModalNext = (): Locator => this.page.locator('.hulyModal-footer button:has-text("Next")')
  readonly buttonNewDirectChatModalCreate = (): Locator =>
    this.page.locator('.hulyModal-footer button:has-text("Create")')

  readonly directMessagesButtonInLeftMenu = (): Locator =>
    this.page.locator('.hulyNavGroup-header:has-text("Direct messages")')

  // ACTIONS

  async clickChannelBrowser (): Promise<void> {
    await this.buttonChannelBrowser().click()
  }

  async clickNewChannelHeader (): Promise<void> {
    await this.buttonNewChannelHeader().click()
  }

  async clickNewDirectChatHeader (): Promise<void> {
    await this.buttonNewDirectChatHeader().click()
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

  async createDirectChat ({ firstName, lastName }: SignUpData): Promise<void> {
    await this.clickChannelBrowser()
    await this.clickNewDirectChatHeader()
    await this.inputNewDirectChatEmployee().fill(`${lastName}`)
    await this.rowEmployeeInNewDirectChatModal()
      .filter({ hasText: `${lastName} ${firstName}` })
      .click()
    await this.buttonNewDirectChatModalNext().click()
    await this.buttonNewDirectChatModalCreate().click()
    await expect(this.directMessagesButtonInLeftMenu()).toBeVisible()
  }
}
