import { test } from '@playwright/test'
import { PlatformURI, generateTestData } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { ApiEndpoint } from '../API/Api'
import { LoginPage } from '../model/login-page'
import { createNewIssueData, prepareNewIssueWithOpenStep } from '../tracker/common-steps'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { InboxPage } from '../model/inbox.ts/inbox-page'
import { SignUpData } from '../model/common-types'
import { faker } from '@faker-js/faker'
import { SignInJoinPage } from '../model/signin-page'
import { ChannelPage } from '../model/channel-page'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { MenuItems, NotificationsPage } from '../model/profile/notifications-page'

test.describe('Inbox tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let loginPage: LoginPage
  let issuesDetailsPage: IssuesDetailsPage
  let inboxPage: InboxPage
  let api: ApiEndpoint
  let newUser2: SignUpData
  let data: { workspaceName: string, userName: string, firstName: string, lastName: string, channelName: string }

  test.beforeEach(async ({ page, request }) => {
    data = generateTestData()
    newUser2 = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    leftSideMenuPage = new LeftSideMenuPage(page)
    loginPage = new LoginPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    inboxPage = new InboxPage(page)
    api = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createAccount(newUser2.email, newUser2.password, newUser2.firstName, newUser2.lastName)
    await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    await (await page.goto(`${PlatformURI}`))?.finished()
    await loginPage.login(data.userName, '1234')
    await (await page.goto(`${PlatformURI}/workbench/${data.workspaceName}`))?.finished()
  })

  test('User is able to create a task, assign a himself and see it inside the inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
  })

  test('User is able to create a task, assign a himself and open it from inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPage.clickOnToDo(newIssue.title)
    await inboxPage.clickLeftSidePanelOpen()
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
  })

  test.skip('User is able to create a task, assign a himself and close it from inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)

    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPage.clickOnToDo(newIssue.title)
    await inboxPage.clickLeftSidePanelOpen()
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await inboxPage.clickCloseLeftSidePanel()
    // ADD ASSERT ONCE THE ISSUE IS FIXED
  })

  test('User is able to assign someone else and he should see the inbox task', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const inboxPageSecond = new InboxPage(page2)
    await leftSideMenuPage.clickOnCloseInvite()
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)

    const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPageSecond.clickTracker()
    await leftSideMenuPageSecond.clickNotification()
    await inboxPageSecond.checkIfTaskIsPresentInInbox(newIssue.title)
  })

  test('User is able to assign someone else and he should be able to open the task', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const issuesDetailsPageSecond = new IssuesDetailsPage(page2)
    const inboxPageSecond = new InboxPage(page2)
    await leftSideMenuPage.clickOnCloseInvite()
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)

    const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPageSecond.clickTracker()
    await leftSideMenuPageSecond.clickNotification()
    await inboxPageSecond.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPageSecond.clickOnToDo(newIssue.title)
    await inboxPageSecond.clickLeftSidePanelOpen()
    await issuesDetailsPageSecond.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
  })
  test.skip('User is able to create a task, assign a other user and close it from inbox', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const issuesDetailsPageSecond = new IssuesDetailsPage(page2)
    const inboxPageSecond = new InboxPage(page2)
    await leftSideMenuPage.clickOnCloseInvite()
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)

    const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPageSecond.clickTracker()
    await leftSideMenuPageSecond.clickNotification()
    await inboxPageSecond.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPageSecond.clickOnToDo(newIssue.title)
    await inboxPageSecond.clickLeftSidePanelOpen()
    await issuesDetailsPageSecond.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await inboxPage.clickCloseLeftSidePanel()
    // ADD ASSERT ONCE THE ISSUE IS FIXED
  })

  test('User is able to send message to other user and he should see it in inbox', async ({ page, browser }) => {
    const channelPage = new ChannelPage(page)
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()

    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const inboxPageSecond = new InboxPage(page2)
    await leftSideMenuPage.clickOnCloseInvite()
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)
    await page.waitForTimeout(1000)

    await leftSideMenuPage.clickChunter()
    await channelPage.clickChannel('general')
    await channelPage.sendMessage('Test message')

    await channelPage.checkMessageExist('Test message', true, 'Test message')
    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfInboxChatExists('Channel general', false)
    await leftSideMenuPageSecond.clickNotification()
    await inboxPageSecond.checkIfInboxChatExists('Channel general', true)
    await inboxPageSecond.clickOnInboxChat('Channel general')
    await inboxPageSecond.checkIfTextInChatIsPresent('Test message')
  })

  test('User is able to turn off notification and he should not receive messages to inbox', async ({
    page,
    browser
  }) => {
    const channelPage = new ChannelPage(page)
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()

    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const inboxPageSecond = new InboxPage(page2)
    const notificationPageSecond = new NotificationsPage(page2)
    await leftSideMenuPage.clickOnCloseInvite()
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)
    const userProfilePageSecond = new UserProfilePage(page2)
    await userProfilePageSecond.openProfileMenu()
    await userProfilePageSecond.clickSettings()
    await userProfilePageSecond.clickOnNotificationsButton()
    await notificationPageSecond.clickMenuItem(MenuItems.CHAT)
    await notificationPageSecond.toggleChatMessage()
    await page.waitForTimeout(1000)
    await leftSideMenuPage.clickChunter()
    await channelPage.clickChannel('general')
    await channelPage.sendMessage('Test message')
    await channelPage.checkMessageExist('Test message', true, 'Test message')
    await leftSideMenuPageSecond.clickNotification()
    await inboxPageSecond.checkIfInboxChatExists('Channel general', false)
  })

  test('User is able to change filter in inbox', async ({ page, browser }) => {
    const channelPage = new ChannelPage(page)
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    const inboxPageSecond = new InboxPage(page2)
    await leftSideMenuPage.clickOnCloseInvite()
    await page2.goto(linkText ?? '')
    const joinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)

    await leftSideMenuPage.clickChunter()
    await channelPage.clickChannel('general')
    await channelPage.sendMessage('Test message')
    await leftSideMenuPage.clickTracker()

    const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await leftSideMenuPageSecond.clickTracker()
    await leftSideMenuPageSecond.clickNotification()
    await inboxPageSecond.clickOnInboxFilter('Channels')
    await inboxPageSecond.checkIfInboxChatExists(newIssue.title, false)
    await inboxPageSecond.checkIfInboxChatExists('Test message', true)
    await inboxPageSecond.clickOnInboxFilter('Issues')
    await inboxPageSecond.checkIfIssueIsPresentInInbox(newIssue.title)
    await inboxPageSecond.checkIfInboxChatExists('Channel general', false)
  })
})
