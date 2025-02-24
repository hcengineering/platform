import { expect, test } from '@playwright/test'
import { ApiEndpoint } from '../API/Api'
import { ChannelPage } from '../model/channel-page'
import { ChunterPage } from '../model/chunter-page'
import { SignUpData } from '../model/common-types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import {
  PlatformURI,
  generateTestData,
  getInviteLink,
  generateUser,
  createAccount,
  getSecondPageByInvite
} from '../utils'

test.describe('Check direct messages channels', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let chunterPage: ChunterPage
  let channelPage: ChannelPage
  let loginPage: LoginPage
  let api: ApiEndpoint
  let newUser2: SignUpData
  let data: { workspaceName: string, userName: string, firstName: string, lastName: string, channelName: string }

  test.beforeEach(async ({ page, request }) => {
    data = generateTestData()
    newUser2 = generateUser()

    leftSideMenuPage = new LeftSideMenuPage(page)
    chunterPage = new ChunterPage(page)
    channelPage = new ChannelPage(page)
    loginPage = new LoginPage(page)
    api = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    await (await page.goto(`${PlatformURI}`))?.finished()
    await loginPage.login(data.userName, '1234')
    const swp = new SelectWorkspacePage(page)
    await swp.selectWorkspace(data.workspaceName)
  })

  test('User can create/close/reacreate direct chat with employee', async ({ request, page, browser }) => {
    const linkText = await getInviteLink(page)
    await createAccount(request, newUser2)
    using _page2 = await getSecondPageByInvite(browser, linkText, newUser2)
    const page2 = _page2.page
    const channelPageSecond = new ChannelPage(page2)
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    await leftSideMenuPageSecond.clickChunter()

    await test.step('Create a direct chat', async () => {
      await leftSideMenuPage.clickChunter()
      await chunterPage.createDirectChat(newUser2)
    })

    await test.step('Exchange messages in the direct chat', async () => {
      await channelPage.clickChooseChannel(`${newUser2.lastName} ${newUser2.firstName}`)
      await channelPage.sendMessage('Test direct question')

      await channelPageSecond.clickChooseChannel(`${data.lastName} ${data.firstName}`)
      await channelPageSecond.checkMessageExist('Test direct question', true, 'Test direct question')
      await channelPageSecond.sendMessage('Test direct answer')

      await channelPage.checkMessageExist('Test direct answer', true, 'Test direct answer')
    })

    await test.step('Close conversation', async () => {
      await channelPage.makeActionWithChannelInMenu(`${newUser2.lastName} ${newUser2.firstName}`, 'Close conversation')
      await expect(chunterPage.directMessagesButtonInLeftMenu()).toBeHidden()
    })

    await test.step('Recreate a direct chat and see if messages are kept', async () => {
      await page.reload()
      await channelPage.clickChooseChannel('general')

      await chunterPage.createDirectChat(newUser2)
      await channelPage.clickChooseChannel(`${newUser2.lastName} ${newUser2.firstName}`)
      await channelPage.checkMessageExist('Test direct answer', true, 'Test direct answer')
    })
  })
})
