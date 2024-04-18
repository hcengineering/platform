import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { ChunterPage } from './model/chunter-page'
import { ChannelPage } from './model/channel-page'

test.use({
  storageState: PlatformSetting
})

test.describe('channel tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let chunterPage: ChunterPage
  let channelPage: ChannelPage
  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    chunterPage = new ChunterPage(page)
    channelPage = new ChannelPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create new private channel tests', async () => {
    await leftSideMenuPage.buttonChunter.click()
    await chunterPage.clickChannelBrowser()
    await chunterPage.clickNewChannelHeader()
    const channel = 'channel-' + generateId()
    await chunterPage.createPrivateChannel(channel, true)
    await channelPage.sendMessage('Test message')
    await channelPage.checkMessageExist('Test message')
  })
})
