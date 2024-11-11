import { faker } from '@faker-js/faker'
import { test } from '@playwright/test'
import { ApiEndpoint } from '../API/Api'
import { ChannelPage } from '../model/channel-page'
import { SignUpData } from '../model/common-types'
import { InboxPage } from '../model/inbox.ts/inbox-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { LoginPage } from '../model/login-page'
import { PlanningPage } from '../model/planning/planning-page'
import { MenuItems, NotificationsPage } from '../model/profile/notifications-page'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { SignInJoinPage } from '../model/signin-page'
import { TeamPage } from '../model/team-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { createNewIssueData, prepareNewIssueWithOpenStep } from '../tracker/common-steps'
import { attachScreenshot, generateTestData, getTimeForPlanner, PlatformURI, setTestOptions } from '../utils'

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
    await setTestOptions(page)
    await loginPage.login(data.userName, '1234')
    const swp = new SelectWorkspacePage(page)
    await swp.selectWorkspace(data.workspaceName)
    // await (await page.goto(`${PlatformURI}/workbench/${data.workspaceName}`))?.finished()
  })

  test('User is able to create a task, assign a himself and see it inside the inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue, false)
    await issuesDetailsPage.checkIssue(newIssue)
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
  })

  test('User is able to create a task, assign a himself and open it from inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)
    await prepareNewIssueWithOpenStep(page, newIssue, false)
    await issuesDetailsPage.checkIssue(newIssue)
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPage.clickOnToDo(newIssue.title)
    await inboxPage.clickLeftSidePanelOpen()
    await issuesDetailsPage.checkIssue(newIssue)
  })

  test.skip('User is able to create a task, assign a himself and close it from inbox', async ({ page }) => {
    const newIssue = createNewIssueData(data.firstName, data.lastName)

    await prepareNewIssueWithOpenStep(page, newIssue, false)
    await issuesDetailsPage.checkIssue(newIssue)
    await leftSideMenuPage.clickTracker()

    await leftSideMenuPage.clickNotification()
    await inboxPage.checkIfTaskIsPresentInInbox(newIssue.title)
    await inboxPage.clickOnToDo(newIssue.title)
    await inboxPage.clickLeftSidePanelOpen()
    await issuesDetailsPage.checkIssue(newIssue)
    await inboxPage.clickCloseLeftSidePanel()
    // ADD ASSERT ONCE THE ISSUE IS FIXED
  })

  test('User is able to assign someone else and he should see the inbox task', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
      const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
      const inboxPageSecond = new InboxPage(page2)
      await leftSideMenuPage.clickOnCloseInvite()
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
      const joinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)

      const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
      await prepareNewIssueWithOpenStep(page, newIssue, false)
      await issuesDetailsPage.checkIssue(newIssue)
      await leftSideMenuPageSecond.clickTracker()
      await leftSideMenuPageSecond.clickNotification()
      await inboxPageSecond.checkIfTaskIsPresentInInbox(newIssue.title)
    } finally {
      await page2.close()
    }
  })

  test('User is able to assign someone else and he should be able to open the task', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
      const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
      const issuesDetailsPageSecond = new IssuesDetailsPage(page2)
      const inboxPageSecond = new InboxPage(page2)
      await leftSideMenuPage.clickOnCloseInvite()
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
      const joinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)

      const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
      await prepareNewIssueWithOpenStep(page, newIssue, false)
      await issuesDetailsPage.checkIssue(newIssue)
      await leftSideMenuPageSecond.clickTracker()
      await leftSideMenuPageSecond.clickNotification()
      await inboxPageSecond.checkIfTaskIsPresentInInbox(newIssue.title)
      await inboxPageSecond.clickOnToDo(newIssue.title)
      await inboxPageSecond.clickLeftSidePanelOpen()
      await issuesDetailsPageSecond.checkIssue(newIssue)
    } finally {
      await page2.close()
    }
  })
  test.skip('User is able to create a task, assign a other user and close it from inbox', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
      const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
      const issuesDetailsPageSecond = new IssuesDetailsPage(page2)
      const inboxPageSecond = new InboxPage(page2)
      await leftSideMenuPage.clickOnCloseInvite()
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
      const joinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)

      const newIssue = createNewIssueData(newUser2.firstName, newUser2.lastName)
      await prepareNewIssueWithOpenStep(page, newIssue, false)
      await issuesDetailsPage.checkIssue(newIssue)
      await leftSideMenuPageSecond.clickTracker()
      await leftSideMenuPageSecond.clickNotification()
      await inboxPageSecond.checkIfTaskIsPresentInInbox(newIssue.title)
      await inboxPageSecond.clickOnToDo(newIssue.title)
      await inboxPageSecond.clickLeftSidePanelOpen()
      await issuesDetailsPageSecond.checkIssue(newIssue)
      await inboxPage.clickCloseLeftSidePanel()
    } finally {
      // ADD ASSERT ONCE THE ISSUE IS FIXED
      await page2.close()
    }
  })

  test('User is able to send message to other user and he should see it in inbox', async ({ page, browser }) => {
    const channelPage = new ChannelPage(page)
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
      const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
      const inboxPageSecond = new InboxPage(page2)
      await leftSideMenuPage.clickOnCloseInvite()
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
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
    } finally {
      await page2.close()
    }
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
    try {
      const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
      const inboxPageSecond = new InboxPage(page2)
      const notificationPageSecond = new NotificationsPage(page2)
      await leftSideMenuPage.clickOnCloseInvite()
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
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
    } finally {
      await page2.close()
    }
  })

  test('User is able to change filter in inbox', async ({ page, browser }) => {
    const channelPage = new ChannelPage(page)
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    const page2 = await browser.newPage()
    try {
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
      await prepareNewIssueWithOpenStep(page, newIssue, false)
      await issuesDetailsPage.checkIssue(newIssue)
      await leftSideMenuPageSecond.clickTracker()
      await leftSideMenuPageSecond.clickNotification()
      await inboxPageSecond.clickOnInboxFilter('Channels')
      await inboxPageSecond.checkIfInboxChatExists(newIssue.title, false)
      await inboxPageSecond.checkIfInboxChatExists('Test message', true)
      await inboxPageSecond.clickOnInboxFilter('Issues')
      await inboxPageSecond.checkIfIssueIsPresentInInbox(newIssue.title)
      await inboxPageSecond.checkIfInboxChatExists('Channel general', false)
    } finally {
      await page2.close()
    }
  })

  test('Checking the ability to receive a task and schedule it', async ({ page, browser }) => {
    await leftSideMenuPage.openProfileMenu()
    await leftSideMenuPage.inviteToWorkspace()
    await leftSideMenuPage.getInviteLink()
    const linkText = await page.locator('.antiPopup .link').textContent()
    await leftSideMenuPage.clickOnCloseInvite()

    const page2 = await browser.newPage()
    try {
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
      const joinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)

      const newIssue = createNewIssueData(data.firstName, data.lastName, {
        status: 'Todo',
        assignee: `${newUser2.lastName} ${newUser2.firstName}`,
        estimation: '0'
      })
      await prepareNewIssueWithOpenStep(page, newIssue, false)
      await issuesDetailsPage.checkIssue(newIssue)

      const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
      const inboxPageSecond = new InboxPage(page2)
      const issuesDetailsPageSecond = new IssuesDetailsPage(page2)
      const planningPageSecond = new PlanningPage(page2)
      await leftSideMenuPageSecond.clickNotification()
      await inboxPageSecond.checkIfIssueIsPresentInInbox(newIssue.title)
      await inboxPageSecond.clickIssuePresentInInbox(newIssue.title)
      await inboxPageSecond.clickLeftSidePanelOpen()
      await issuesDetailsPageSecond.checkIssue(newIssue)
      await leftSideMenuPageSecond.clickPlanner()
      await planningPageSecond.closeNotification()
      await planningPageSecond.dragToCalendar(newIssue.title, 2, getTimeForPlanner())
      await planningPageSecond.eventInSchedule(newIssue.title).isVisible()
      await attachScreenshot('Recive_task_and_scheduled.png', page2)

      await attachScreenshot('Recive_task_and_scheduled-Detail.png', page)
      await issuesDetailsPage.checkIssue({ ...newIssue, status: 'In Progress' })
      await leftSideMenuPage.clickTeam()
      const teamPage = new TeamPage(page)
      await teamPage.checkTeamPageIsOpened()
      await teamPage.selectTeam('Default')
      await teamPage.buttonNextDay().click()
      await attachScreenshot('Recive_task_and_scheduled-Tomorrow.png', page)
      await teamPage.getItemByText('Tomorrow', newIssue.title).isVisible()
    } finally {
      await page2.close()
    }
  })
})
