import { test } from '@playwright/test'
import { generateId, PlatformUser } from './utils'
import { LoginPage } from './model/login-page'
import { SelectWorkspacePage } from './model/select-workspace-page'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { ChunterPage } from './model/chunter-page'
import { ChannelPage } from './model/channel-page'

test.describe('channel tests', () => {
  test('create new private channel tests', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(PlatformUser, '1234')

    const selectWorkspacePage = new SelectWorkspacePage(page)
    await selectWorkspacePage.selectWorkspace('sanity-ws')

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
