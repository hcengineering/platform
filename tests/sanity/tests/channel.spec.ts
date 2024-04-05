import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { ChunterPage } from './model/chunter-page'
import { ChannelPage } from './model/channel-page'

test.use({
  storageState: PlatformSetting
})

test.describe('channel tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create new private channel tests', async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonChunter.click()

    const chunterPage = new ChunterPage(page)
    //await chunterPage.buttonChannelBrowser.click()
    await chunterPage.buttonPlusSign.click()
    await chunterPage.buttonNewChannelHeader.click()

    const channel = 'channel-' + generateId()
    await chunterPage.createNewChannel(channel, true)
    await chunterPage.openChannel(channel)

    const channelPage = new ChannelPage(page)
    await channelPage.sendMessage('Test message')
    await channelPage.checkMessageExist('Test message')
  })

  test('create public channel and add members',async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonChunter.click()

    const chunterPage = new ChunterPage(page)
    //await chunterPage.buttonChannelBrowser.click()
    await chunterPage.buttonPlusSign.click()
    await chunterPage.buttonNewChannelHeader.click()

    const channel = 'channel-' + generateId()
    await chunterPage.createNewChannel(channel, false)
    await chunterPage.openChannel(channel)

    const channelPage = new ChannelPage(page)
    await channelPage.buttonChannelSettings.click()
    await channelPage.buttonAddMembers.click()

    // There is a bug, if we try to enter the surname it is not able to search the member then...
    await channelPage.enterMemberName('Chen')
    await channelPage.checkBoxMemberAdd.click()
    await channelPage.buttonAddMember.click

    await channelPage.checkMemberGotAdded('Chen')
  })

  test('create a channel and then remove',async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonChunter.click()

    const chunterPage = new ChunterPage(page)
    //await chunterPage.buttonChannelBrowser.click()
    await chunterPage.buttonPlusSign.click()
    await chunterPage.buttonNewChannelHeader.click()

    const channel = 'channel-' + generateId()
    await chunterPage.createNewChannel(channel, false)
    await chunterPage.openChannel(channel)
    await chunterPage.clickOnMoreOptionsOfChannel(channel)
    await chunterPage.buttonLeaveChannel.click()
    await page.waitForTimeout(2000);
    await chunterPage.checkIfChannelNameIsRemoved(channel)
  })
})
