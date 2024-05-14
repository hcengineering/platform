import { test } from '@playwright/test'
import { PlatformURI, data } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { ChunterPage } from '../model/chunter-page'
import { ChannelPage } from '../model/channel-page'
import { ApiEndpoint } from '../API/Api'
import { LoginPage } from '../model/login-page'
import { SignUpData } from '../model/common-types'
import { faker } from '@faker-js/faker'
import { SignInJoinPage } from '../model/signin-page'

test.describe('channel tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let chunterPage: ChunterPage
  let channelPage: ChannelPage
  let loginPage: LoginPage
  let api: ApiEndpoint
  const newUser2: SignUpData = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    password: '1234'
  }

  test.beforeEach(async ({ page, request }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    chunterPage = new ChunterPage(page)
    channelPage = new ChannelPage(page)
    loginPage = new LoginPage(page)
    api = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    await (await page.goto(`${PlatformURI}/workbench/${data.workspaceName}`))?.finished()
    await loginPage.login(data.userName, '1234')
  })

  test('create new private channel tests and check if the new user have access to it', async ({ browser, page }) => {
    await leftSideMenuPage.clickChunter()
    await chunterPage.clickChannelBrowser()
    await chunterPage.clickNewChannelHeader()
    await chunterPage.createPrivateChannel(data.channelName, true)
    await channelPage.checkIfChannelDefaultExist(true, data.channelName)
    await channelPage.sendMessage('Test message')
    await channelPage.checkMessageExist('Test message')
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()

    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const channelPageSecond = new ChannelPage(page2)
    await api.createAccount(newUser2.email, newUser2.password, newUser2.firstName, newUser2.lastName)
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)
    await leftSideMenuPageSecond.clickChunter()
    await channelPageSecond.checkIfChannelDefaultExist(false, data.channelName)
    await channelPageSecond.clickChannelTab()
    await channelPageSecond.checkIfChannelTableExist()
  })

  test('create new public channel tests and check if the new user have access to it by default', async ({
    browser,
    page
  }) => {
    await leftSideMenuPage.clickChunter()
    await chunterPage.clickChannelBrowser()
    await chunterPage.clickNewChannelHeader()
    await chunterPage.createPrivateChannel(data.channelName, false)
    await channelPage.checkIfChannelDefaultExist(true, data.channelName)
    await channelPage.sendMessage('Test message')
    await channelPage.checkMessageExist('Test message')
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()

    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const channelPageSecond = new ChannelPage(page2)
    await api.createAccount(newUser2.email, newUser2.password, newUser2.firstName, newUser2.lastName)
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)
    await leftSideMenuPageSecond.clickChunter()
    await channelPageSecond.checkIfChannelDefaultExist(false, data.channelName)
    await channelPageSecond.clickChannelTab()
    await channelPageSecond.checkIfChannelTableExist()
  })
})
