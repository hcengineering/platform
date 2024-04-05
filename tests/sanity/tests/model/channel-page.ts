import { expect, type Locator, type Page } from '@playwright/test'

export class ChannelPage {
  readonly page: Page
  readonly inputMessage: Locator
  readonly buttonSendMessage: Locator
  readonly textMessage: Locator
  readonly buttonChannelSettings: Locator
  readonly buttonAddMembers: Locator
  readonly inputSearchMemberName: Locator
  readonly checkBoxMemberAdd: Locator
  readonly buttonAddMember: Locator
  readonly membersList: Locator

  constructor (page: Page) {
    this.page = page
    this.inputMessage = page.locator('div[class~="text-editor-view"]')
    this.buttonSendMessage = page.locator('g#Send')
    this.textMessage = page.locator('p.p-inline.contrast')
    this.buttonChannelSettings = page.locator('button.antiButton.icon.medium.jf-center')
    this.buttonAddMembers = page.locator('button span' , {hasText: 'Add members'})
    this.inputSearchMemberName = page.locator('input[placeholder="Search..."]')
    this.checkBoxMemberAdd = page.locator('label.checkbox.small')
    this.buttonAddMember = page.locator('span', {hasText: 'Add'})
    this.membersList = page.locator('div.label.overflow-label.text-left.svelte-f4zgk')
  }

  async sendMessage (message: string): Promise<void> {
    await this.inputMessage.fill(message)
    await this.buttonSendMessage.click()
  }

  async checkMessageExist (message: string): Promise<void> {
    await expect(this.textMessage.filter({ hasText: message })).toBeVisible()
  }

  async enterMemberName(name: string): Promise<void> {
    await this.inputSearchMemberName.fill(name)
  }

  async checkMemberGotAdded(name: string): Promise<void> {
    await expect(this.membersList.filter({hasText: name})).toBeVisible()
  }
}
