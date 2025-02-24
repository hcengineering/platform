import { test } from '@playwright/test'
import { ApiEndpoint } from '../API/Api'
import { ChannelPage } from '../model/channel-page'
import { SignUpData } from '../model/common-types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import {
  PlatformURI,
  generateTestData,
  generateUser,
  getInviteLink,
  createAccount,
  generateId,
  getSecondPageByInvite
} from '../utils'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewIssue } from '../model/tracker/types'
import { prepareNewIssueWithOpenStep } from '../tracker/common-steps'
import { LinkedChannelTypes } from '../model/types'

test.describe('Dynamic issues chats', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let channelPage: ChannelPage
  let loginPage: LoginPage
  let api: ApiEndpoint
  let newUser2: SignUpData
  let data: { workspaceName: string, userName: string, firstName: string, lastName: string, channelName: string }

  test.beforeEach(async ({ page, request }) => {
    data = generateTestData()
    newUser2 = generateUser()

    leftSideMenuPage = new LeftSideMenuPage(page)
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

  test('User can create issue for himself and see linked chat', async ({ page, browser, request }) => {
    const newIssue: NewIssue = {
      title: `Issue to test dynamic chat-${generateId()}`,
      description: 'Created issue with all parameters and attachments description',
      status: 'ToDo',
      priority: 'High',
      assignee: `${data.lastName} ${data.firstName}`
    }

    await test.step('User 1 creates Issue for himself', async () => {
      await prepareNewIssueWithOpenStep(page, newIssue, false)
    })

    await test.step('User 1 has issue and linked chat', async () => {
      await leftSideMenuPage.clickChunter()
      await channelPage.checkLinkedChannelIsExist(newIssue.title, LinkedChannelTypes.Issue)
    })
  })

  test('User can see chat for assigned issue from other user', async ({ page, browser, request }) => {
    const linkText = await getInviteLink(page)
    await createAccount(request, newUser2)
    using _page2 = await getSecondPageByInvite(browser, linkText, newUser2)
    const page2 = _page2.page

    const channelPageSecond = new ChannelPage(page2)
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)

    const newIssue: NewIssue = {
      title: `Issue to test dynamic chat-${generateId()}`,
      description: 'Created issue for employee with all parameters and attachments description',
      status: 'ToDo',
      priority: 'High',
      assignee: `${newUser2.lastName} ${newUser2.firstName}`
    }

    await test.step('User 1 creates an issue and assign it to User 2', async () => {
      await prepareNewIssueWithOpenStep(page, newIssue, false)
    })

    await test.step('User 2 has issue and linked chat', async () => {
      await leftSideMenuPageSecond.clickChunter()
      await channelPageSecond.checkLinkedChannelIsExist(newIssue.title, LinkedChannelTypes.Issue)
    })

    await test.step('User 1 adds comment and User 2 sees it in chat', async () => {
      const commentText = `Comment to show in chat-${generateId()}`
      const issuesDetailsPage = new IssuesDetailsPage(page)
      await issuesDetailsPage.waitDetailsOpened(newIssue.title)
      await issuesDetailsPage.addComment(commentText)
      await issuesDetailsPage.checkCommentExist(commentText)

      await channelPageSecond.clickChooseChannel(newIssue.title)
      await channelPageSecond.checkMessageExist(commentText, true, commentText)
    })
  })
})
