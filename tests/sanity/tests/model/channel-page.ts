import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from './common-page'
import { LinkedChannelTypes } from './types'

export class ChannelPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly inputMessage = (): Locator => this.page.locator('div[class~="text-editor-view"]')
  readonly buttonSendMessage = (): Locator => this.page.locator('g#Send')
  readonly textMessage = (messageText: string, strict = false): Locator =>
    strict
      ? this.page.locator('.hulyComponent .activityMessage div[data-delivered]', { hasText: messageText })
      : this.page.locator('.hulyComponent .activityMessage', { hasText: messageText })

  readonly textMessageInSidebar = (messageText: string, strict = false): Locator =>
    strict
      ? this.page.locator('#sidebar .activityMessage div[data-delivered]', { hasText: messageText })
      : this.page.locator('#sidebar .activityMessage', { hasText: messageText })

  readonly channelName = (channel: string): Locator => this.page.getByText('general random').getByText(channel)
  readonly channelTab = (): Locator => this.page.getByRole('link', { name: 'Channels' }).getByRole('button')
  readonly channelTable = (): Locator => this.page.getByRole('table')
  readonly channel = (channel: string): Locator => this.page.getByRole('button', { name: channel })
  readonly channelNameOnDetail = (channel: string): Locator =>
    this.page
      .locator('span.labelOnPanel', { hasText: 'Name' })
      .locator('xpath=following-sibling::div[1]')
      .locator('button', { hasText: channel })

  readonly chooseChannel = (channel: string): Locator =>
    this.page.locator('div.antiPanel-navigator').getByRole('button', { name: channel })

  readonly closePopupWindow = (): Locator => this.page.locator('.notifyPopup button[data-id="btnNotifyClose"]')
  readonly openAddMemberToChannel = (userName: string): Locator => this.page.getByRole('button', { name: userName })
  readonly addMemberToChannelTableButton = (userName: string): Locator =>
    this.page.locator('.antiTable-body__row').getByText(userName)

  readonly addMemberToChannelButton = (userName: string): Locator => this.page.getByText(userName)
  readonly joinChannelButton = (): Locator => this.page.getByRole('button', { name: 'Join' })
  readonly addEmojiButton = (): Locator =>
    this.page.locator('.activityMessage-actionPopup > button[data-id$="AddReactionAction"]').last()

  readonly selectEmoji = (emoji: string): Locator => this.page.getByText(emoji)
  readonly saveMessageButton = (): Locator =>
    this.page.locator('.activityMessage-actionPopup > button[data-id$="SaveForLaterAction"]').last()

  readonly pinMessageButton = (): Locator =>
    this.page.locator('.activityMessage-actionPopup > button[data-id$="PinMessageAction"]').last()

  readonly replyButton = (): Locator =>
    this.page.locator('.activityMessage-actionPopup > button[data-id="activity:action:Reply"]').last()

  readonly openMoreButton = (): Locator =>
    this.page.locator('.activityMessage-actionPopup > button[data-id="btnMoreActions"]').last()

  readonly messageSaveMarker = (): Locator => this.page.locator('.saveMarker')
  readonly saveMessageTab = (): Locator => this.page.getByRole('button', { name: 'Saved' })
  readonly pinnedMessageButton = (): Locator => this.page.getByRole('button', { name: 'pinned' })
  readonly pinnedMessage = (message: string): Locator => this.page.locator('.antiPopup').getByText(message)
  readonly closeReplyButton = (): Locator => this.page.locator('.hulyHeader-container > button.iconOnly')
  readonly openReplyMessage = (): Locator => this.page.getByText('1 reply Last reply less than')
  readonly editMessageButton = (): Locator => this.page.getByRole('button', { name: 'Edit' })
  readonly copyLinkButton = (): Locator => this.page.getByRole('button', { name: 'Copy link' })
  readonly deleteMessageButton = (): Locator => this.page.getByRole('button', { name: 'Delete' })
  readonly updateButton = (): Locator => this.page.getByRole('button', { name: 'Update' })
  readonly openChannelDetails = (): Locator => this.page.getByTestId('aside-toggle')
  readonly changeChannelNameConfirm = (): Locator => this.page.locator('.selectPopup button')
  readonly privateOrPublicChangeButton = (change: string, autoJoin: boolean): Locator =>
    this.page
      .locator('span.labelOnPanel', { hasText: autoJoin ? 'Auto join' : 'Private' })
      .locator('xpath=following-sibling::div[1]')
      .locator('button', { hasText: change })

  readonly privateOrPublicPopupButton = (change: string): Locator =>
    this.page.locator('div.popup div.menu-item', { hasText: change })

  readonly userAdded = (user: string): Locator => this.page.locator('.members').getByText(user)
  private readonly addMemberPreview = (): Locator => this.page.getByRole('button', { name: 'Add members' })
  private readonly addButtonPreview = (): Locator => this.page.getByRole('button', { name: 'Add', exact: true })

  readonly inputSearchIcon = (): Locator => this.page.locator('.searchInput-wrapper')
  readonly inputSearchChannel = (): Locator => this.page.locator('.hulyHeader-container').getByPlaceholder('Search')

  readonly channelContainers = (): Locator => this.page.locator('.hulyNavItem-container')

  readonly starredChannelContainers = (): Locator =>
    this.page.locator('#navGroup-starred').locator('.hulyNavItem-container')

  readonly issueChannelContainers = (): Locator =>
    this.page.locator('#navGroup-tracker\\:class\\:Issue').locator('.hulyNavItem-container')

  readonly vacancyChannelContainers = (): Locator =>
    this.page.locator('#navGroup-recruit\\:class\\:Vacancy').locator('.hulyNavItem-container')

  readonly applicationChannelContainers = (): Locator =>
    this.page.locator('#navGroup-recruit\\:class\\:Applicant').locator('.hulyNavItem-container')

  async sendMessage (message: string): Promise<void> {
    await this.inputMessage().fill(message)
    await this.buttonSendMessage().click()
  }

  async sendMention (message: string, categoryName?: string): Promise<void> {
    for (let i = 0; i < 3; i++) {
      try {
        await this.inputMessage().fill(`@${message}`)
        await this.selectMention(message, categoryName)
        break
      } catch (error: any) {
        if (i === 2) {
          throw error
        }
        await this.page.waitForTimeout(1000)
      }
    }

    await this.buttonSendMessage().click()
  }

  async clickOnOpenChannelDetails (): Promise<void> {
    await this.openChannelDetails().click()
  }

  async clickChannel (channel: string): Promise<void> {
    await this.channel(channel).click()
  }

  async changeChannelName (channel: string): Promise<void> {
    await this.channelNameOnDetail(channel).click()
    await this.page.keyboard.type('New Channel Name')
    await this.changeChannelNameConfirm().click()
  }

  async changeChannelPrivacyOrAutoJoin (
    change: string,
    YesNo: string,
    changed: string,
    autoJoin: boolean = false
  ): Promise<void> {
    await this.privateOrPublicChangeButton(change, autoJoin).click()
    await this.page.waitForTimeout(200)
    await this.privateOrPublicPopupButton(YesNo).click()
    await expect(this.privateOrPublicChangeButton(changed, autoJoin)).toBeVisible()
  }

  async clickDeleteMessageButton (): Promise<void> {
    await this.deleteMessageButton().click()
  }

  async clickSaveMessageTab (): Promise<void> {
    await this.saveMessageTab().click()
  }

  async addMemberToChannelPreview (user: string): Promise<void> {
    await this.addMemberPreview().click()
    await this.addMemberToChannelButton(user).click()
    await this.addButtonPreview().click()
    await expect(this.userAdded(user)).toBeVisible()
  }

  async checkIfUserIsAdded (user: string, added: boolean): Promise<void> {
    if (added) {
      await expect(this.userAdded(user)).toBeHidden()
    } else {
      await expect(this.userAdded(user)).toBeVisible()
    }
  }

  async clickOpenMoreButton (message: string): Promise<void> {
    await this.textMessage(message).hover()
    await this.openMoreButton().click()
  }

  async clickEditMessageButton (editedMessage: string): Promise<void> {
    await this.editMessageButton().click()
    await this.page.waitForTimeout(500)
    await this.page.keyboard.type(editedMessage)
  }

  async clickCopyLinkButton (): Promise<void> {
    await this.copyLinkButton().click()
  }

  async clickOnUpdateButton (): Promise<void> {
    await this.updateButton().click()
  }

  async getClipboardCopyMessage (): Promise<void> {
    await this.page.evaluate(async () => {
      return await navigator.clipboard.readText()
    })
  }

  async checkIfMessageIsCopied (message: string): Promise<void> {
    expect(this.getClipboardCopyMessage()).toContain(message)
  }

  async clickChooseChannel (channel: string): Promise<void> {
    await expect(this.chooseChannel(channel)).toBeVisible()
    await this.chooseChannel(channel).click()
  }

  async addEmoji (textMessage: string, emoji: string): Promise<void> {
    await this.textMessage(textMessage).hover()
    await this.addEmojiButton().click()
    await this.selectEmoji(emoji).click()
  }

  async saveMessage (message: string): Promise<void> {
    await this.textMessage(message).hover()
    await this.saveMessageButton().click()
    await expect(this.messageSaveMarker()).toBeVisible()
  }

  async pinMessage (message: string): Promise<void> {
    await this.textMessage(message).hover()
    await this.pinMessageButton().click()
    await this.pinnedMessageButton().click()
    await expect(this.pinnedMessage(message)).toBeVisible()
  }

  async replyMessage (message: string): Promise<void> {
    await this.textMessage(message).hover()
    await this.replyButton().click()
  }

  async sendReply (messageReply: string): Promise<void> {
    await this.page.keyboard.type(messageReply)
    await this.page.keyboard.press('Enter')
  }

  async closeAndOpenReplyMessage (): Promise<void> {
    await this.closeReplyButton().click()
    await this.openReplyMessage().click()
  }

  async clickChannelTab (): Promise<void> {
    await this.channelTab().click()
  }

  async clickOnClosePopupButton (): Promise<void> {
    await this.closePopupWindow().click()
  }

  async clickOnUser (user: string): Promise<void> {
    await this.addMemberToChannelTableButton(user).click()
  }

  async addMemberToChannel (user: string): Promise<void> {
    await this.openAddMemberToChannel(user).click()
  }

  async clickJoinChannelButton (): Promise<void> {
    await this.joinChannelButton().click()
  }

  async getChannelsGroupLocatorByType (channelType: LinkedChannelTypes, channelName: string): Promise<Locator> {
    const mapTypesToLocator = {
      [LinkedChannelTypes.Issue]: this.issueChannelContainers(),
      [LinkedChannelTypes.Vacancy]: this.vacancyChannelContainers(),
      [LinkedChannelTypes.Application]: this.applicationChannelContainers()
    } as const

    const groupLocator: Locator = mapTypesToLocator[channelType] ?? this.issueChannelContainers()
    return groupLocator.filter({ has: this.page.locator(`span:has-text("${channelName}")`) })
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

  async checkMessageExist (message: string, messageExists: boolean, messageText: string): Promise<void> {
    if (messageExists) {
      await expect(this.textMessage(messageText, true)).toBeVisible()
    } else {
      await expect(this.textMessage(messageText)).toBeHidden()
    }
  }

  async checkIfMessageExistInSidebar (messageExists: boolean, messageText: string): Promise<void> {
    if (messageExists) {
      await expect(this.textMessageInSidebar(messageText, true)).toBeVisible()
    } else {
      await expect(this.textMessageInSidebar(messageText)).toBeHidden()
    }
  }

  async checkIfEmojiIsAdded (emoji: string): Promise<void> {
    await expect(this.selectEmoji(emoji + ' 1')).toBeVisible()
  }

  async checkIfNameIsChanged (channel: string): Promise<void> {
    await expect(this.channelContainers().filter({ hasText: channel })).toBeVisible()
    await expect(this.buttonBreadcrumb(channel)).toBeVisible()
  }

  async makeActionWithChannelInMenu (channelName: string, action: string): Promise<void> {
    await this.openNavigator()
    await this.channelContainers().filter({ hasText: channelName }).hover()
    await this.channelContainers().filter({ hasText: channelName }).locator('.hulyNavItem-actions').click()
    await this.selectFromDropdown(this.page, action)
  }

  async checkChannelStarred (shouldExist: boolean, channelName: string): Promise<void> {
    if (shouldExist) {
      await expect(this.starredChannelContainers().filter({ hasText: channelName })).toHaveCount(1)
    } else {
      await expect(this.starredChannelContainers().filter({ hasText: channelName })).toHaveCount(0)
    }
  }

  async searchChannel (channelName: string): Promise<void> {
    await this.inputSearchIcon().click()
    await this.inputSearchChannel().fill(channelName)
  }

  async checkLinkedChannelIsExist (channelName: string, linkedChannelType: LinkedChannelTypes): Promise<void> {
    await expect(await this.getChannelsGroupLocatorByType(linkedChannelType, channelName)).toHaveCount(1)
  }

  async openLinkedChannelIsExist (channelName: string, linkedChannelType: LinkedChannelTypes): Promise<void> {
    await (await this.getChannelsGroupLocatorByType(linkedChannelType, channelName)).click()
  }
}
