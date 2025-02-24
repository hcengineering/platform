import { test } from '@playwright/test'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { NewIssue } from '../model/tracker/types'
import { generateId, getSecondPage, PlatformSetting, PlatformURI } from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Collaborative test for issue', () => {
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage

  test.beforeEach(async ({ page }) => {
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
  })

  test('Issues can be assigned to another users', async ({ page, browser }) => {
    const newIssue: NewIssue = {
      title: `Issues can be assigned to another users-${generateId()}`,
      description: 'Issues can be assigned to another users',
      status: 'Backlog',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      createLabel: true,
      labels: `CREATE-ISSUE-${generateId(5)}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }

    // open second page
    const { page: userSecondPage, context } = await getSecondPage(browser)

    const closePages = async (): Promise<void> => {
      await userSecondPage.close()
      await context.close()
    }

    await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()

    // create a new issue by first user
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()

    await issuesPage.createNewIssue(newIssue)
    await issuesPage.clickLinkSidebarAll()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    // check created issued by second user
    const issuesPageSecond = new IssuesPage(userSecondPage)
    await userSecondPage.evaluate(() => {
      localStorage.setItem('platform.activity.threshold', '0')
    })
    await issuesPageSecond.clickLinkSidebarAll()
    await issuesPageSecond.clickModelSelectorAll()
    await issuesPageSecond.searchIssueByName(newIssue.title)
    await issuesPageSecond.openIssueByName(newIssue.title)

    const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
    await issuesDetailsPageSecond.checkIssue(newIssue)

    await closePages()
  })

  test('Issues status can be changed by another users', async ({ page, browser }) => {
    const issue: NewIssue = {
      title: 'Issues status can be changed by another users',
      description: 'Collaborative test for issue'
    }

    // open second page
    const { page: userSecondPage, context } = await getSecondPage(browser)

    const closePages = async (): Promise<void> => {
      await userSecondPage.close()
      await context.close()
    }

    if (userSecondPage.url() !== `${PlatformURI}/workbench/sanity-ws/tracker/`) {
      await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
    }

    const issuesPageSecond = new IssuesPage(userSecondPage)
    await issuesPageSecond.clickLinkSidebarAll()
    await issuesPageSecond.clickModelSelectorAll()

    // change status
    await issuesPage.clickLinkSidebarAll()
    await issuesPage.clickMdelSelectorBacklog()
    await issuesPage.searchIssueByName(issue.title)
    await issuesPage.openIssueByName(issue.title)
    await issuesDetailsPage.editIssue({ status: 'In Progress' })

    // check by another user
    await issuesPageSecond.clickMdelSelectorBacklog()
    // not active for another user
    await issuesPageSecond.checkIssueNotExist(issue.title)

    await issuesPageSecond.clickModalSelectorActive()
    await issuesPageSecond.searchIssueByName(issue.title)
    await issuesPageSecond.openIssueByName(issue.title)

    const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
    await userSecondPage.evaluate(() => {
      localStorage.setItem('platform.activity.threshold', '0')
    })
    await issuesDetailsPageSecond.checkIssue({
      ...issue,
      status: 'In Progress'
    })

    await closePages()
  })

  test('First user change assignee, second user should see assigned issue', async ({ page, browser }) => {
    const newAssignee: string = 'Dirak Kainin'
    const issue: NewIssue = {
      title: 'First user change assignee, second user should see assigned issue',
      description: 'Issue for collaborative test'
    }

    // open second page
    const { page: userSecondPage, context } = await getSecondPage(browser)

    const closePages = async (): Promise<void> => {
      await userSecondPage.close()
      await context.close()
    }

    await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()

    await test.step(`user1. change assignee to ${newAssignee}`, async () => {
      await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
      await issuesPage.clickLinkSidebarAll()
      await issuesPage.clickMdelSelectorBacklog()
      await issuesPage.searchIssueByName(issue.title)
      await issuesPage.openIssueByName(issue.title)

      await issuesDetailsPage.editIssue({ assignee: newAssignee })
    })

    // TODO: rewrite checkNotificationIssue and uncomment
    // await test.step('user2. check notification', async () => {
    //   const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
    //   await leftSideMenuPageSecond.checkExistNewNotification(userSecondPage)
    //   await leftSideMenuPageSecond.buttonNotification.click()
    //
    //   const notificationPageSecond = new NotificationPage(userSecondPage)
    //   await notificationPageSecond.checkNotificationIssue(issue.title, newAssignee)
    //
    //   await leftSideMenuPageSecond.clickTracker()
    // })

    await test.step('user2. check issue assignee', async () => {
      const issuesPageSecond = new IssuesPage(userSecondPage)
      await issuesPageSecond.clickLinkSidebarMyIssue()
      await issuesPageSecond.clickMdelSelectorBacklog()

      await issuesPageSecond.searchIssueByName(issue.title)
      await issuesPageSecond.openIssueByName(issue.title)

      const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
      await issuesDetailsPageSecond.checkIssue(issue)
    })

    await closePages()
  })
})
