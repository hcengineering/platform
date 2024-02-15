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

  test.skip('create new private channel tests', async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonChunter.click()

    const chunterPage = new ChunterPage(page)
    await chunterPage.buttonChannelBrowser.click()
    await chunterPage.buttonNewChannelHeader.click()

    const channel = 'channel-' + generateId()
    await chunterPage.createNewChannel(channel, true)
    await chunterPage.openChannel(channel)

    const channelPage = new ChannelPage(page)
    await channelPage.sendMessage('Test message')
    await channelPage.checkMessageExist('Test message')
  })
})
