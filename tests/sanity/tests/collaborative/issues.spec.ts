import { test } from '@playwright/test'
import { generateId, getSecondPage, PlatformSetting, PlatformURI } from '../utils'
import { NewIssue } from '../model/tracker/types'
import { IssuesPage } from '../model/tracker/issues-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Collaborative test for issue', () => {
  test.beforeEach(async ({ page }) => {
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
      labels: `CREATE-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }

    // open second page
    const userSecondPage = await getSecondPage(browser)
    await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()

    // create a new issue by first user
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.linkSidebarAll.click()
    await issuesPage.modelSelectorAll.click()
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    // check created issued by second user
    const issuesPageSecond = new IssuesPage(userSecondPage)
    await userSecondPage.evaluate(() => {
      localStorage.setItem('platform.activity.threshold', '0')
    })
    await issuesPageSecond.linkSidebarAll.click()
    await issuesPageSecond.modelSelectorAll.click()
    await issuesPageSecond.searchIssueByName(newIssue.title)
    await issuesPageSecond.openIssueByName(newIssue.title)

    const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
    await issuesDetailsPageSecond.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
    await userSecondPage.close()
  })

  test('Issues status can be changed by another users', async ({ page, browser }) => {
    const issue: NewIssue = {
      title: 'Issues status can be changed by another users',
      description: 'Collaborative test for issue'
    }

    // open second page
    const userSecondPage = await getSecondPage(browser)
    await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()

    const issuesPageSecond = new IssuesPage(userSecondPage)
    await issuesPageSecond.linkSidebarAll.click()
    await issuesPageSecond.modelSelectorAll.click()

    // change status
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
    const issuesPage = new IssuesPage(page)
    await issuesPage.linkSidebarAll.click()
    await issuesPage.modelSelectorBacklog.click()
    await issuesPage.searchIssueByName(issue.title)
    await issuesPage.openIssueByName(issue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.editIssue({ status: 'In Progress' })

    // check by another user
    await issuesPageSecond.modelSelectorBacklog.click()
    // not active for another user
    await issuesPageSecond.checkIssueNotExist(issue.title)

    await issuesPageSecond.modelSelectorActive.click()
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
    await userSecondPage.close()
  })

  test('First user change assignee, second user should see assigned issue', async ({ page, browser }) => {
    const newAssignee: string = 'Dirak Kainin'
    const issue: NewIssue = {
      title: 'First user change assignee, second user should see assigned issue',
      description: 'Issue for collaborative test'
    }

    // open second page
    const userSecondPage = await getSecondPage(browser)
    await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()

    await test.step(`user1. change assignee to ${newAssignee}`, async () => {
      await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
      const issuesPage = new IssuesPage(page)
      await issuesPage.linkSidebarAll.click()
      await issuesPage.modelSelectorBacklog.click()
      await issuesPage.searchIssueByName(issue.title)
      await issuesPage.openIssueByName(issue.title)

      const issuesDetailsPage = new IssuesDetailsPage(page)
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
    //   await leftSideMenuPageSecond.buttonTracker.click()
    // })

    await test.step('user2. check issue assignee', async () => {
      const issuesPageSecond = new IssuesPage(userSecondPage)
      await issuesPageSecond.linkSidebarMyIssue.click()
      await issuesPageSecond.modelSelectorBacklog.click()

      await issuesPageSecond.searchIssueByName(issue.title)
      await issuesPageSecond.openIssueByName(issue.title)

      const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
      await issuesDetailsPageSecond.checkIssue({ ...issue })
    })
    await userSecondPage.close()
  })
})
