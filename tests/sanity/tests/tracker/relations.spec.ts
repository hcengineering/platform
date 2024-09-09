import { test } from '@playwright/test'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewIssue } from '../model/tracker/types'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { prepareNewIssueStep } from './common-steps'

test.use({
  storageState: PlatformSetting
})
test.describe('Relations', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Mark as blocked by', async ({ page }) => {
    const firstIssue: NewIssue = {
      title: `First. Mark as blocked by-${generateId()}`,
      description: 'First. Mark as blocked by'
    }
    const secondIssue: NewIssue = {
      title: `Second. Mark as blocked by-${generateId()}`,
      description: 'Second. Mark as blocked by'
    }
    await leftSideMenuPage.clickTracker()

    const secondIssueId = await prepareNewIssueStep(page, secondIssue)
    const firstIssueId = await prepareNewIssueStep(page, firstIssue)

    await issuesPage.openIssueByName(firstIssue.title)

    await test.step('Set blocked by and check issue description', async () => {
      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.moreActionOnIssueWithSecondLevel('Relations', 'Mark as blocked by...')
      await issuesDetailsPage.fillSearchForIssueModal(secondIssue.title)
      await issuesDetailsPage.checkIssue({
        ...firstIssue,
        blockedBy: secondIssueId
      })
      await issuesDetailsPage.checkActivityContentExist(`New blocked by: ${secondIssueId}`)
    })

    await test.step('Check the second issue description', async () => {
      await trackerNavigationMenuPage.openIssuesForProject('Default')
      await issuesPage.searchIssueByName(secondIssue.title)
      await issuesPage.openIssueByName(secondIssue.title)
      await issuesDetailsPage.waitDetailsOpened(secondIssue.title)
      await issuesDetailsPage.checkIssue({
        ...secondIssue,
        blocks: firstIssueId
      })
    })
  })

  test('Mark as blocking', async ({ page }) => {
    const firstIssue: NewIssue = {
      title: `First. Mark as blocking-${generateId()}`,
      description: 'First. Mark as blocking'
    }
    const secondIssue: NewIssue = {
      title: `Second. Mark as blocked by-${generateId()}`,
      description: 'Second. Mark as blocked by'
    }
    await leftSideMenuPage.clickTracker()

    const secondIssueId = await prepareNewIssueStep(page, secondIssue)
    const firstIssueId = await prepareNewIssueStep(page, firstIssue)
    await issuesPage.openIssueByName(firstIssue.title)
    await test.step('Mark as blocking... and check issue description', async () => {
      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.moreActionOnIssueWithSecondLevel('Relations', 'Mark as blocking...')
      await issuesDetailsPage.fillSearchForIssueModal(secondIssue.title)

      // TODO remove reload after fixed https://front.hc.engineering/workbench/platform/tracker/UBERF-5652
      await page.reload()
      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.checkIssue({
        ...firstIssue,
        blocks: secondIssueId
      })
    })

    await test.step('Check the second issue description', async () => {
      await trackerNavigationMenuPage.openIssuesForProject('Default')
      await issuesPage.searchIssueByName(secondIssue.title)
      await issuesPage.openIssueByName(secondIssue.title)
      await issuesDetailsPage.waitDetailsOpened(secondIssue.title)
      await issuesDetailsPage.checkIssue({
        ...secondIssue,
        blockedBy: firstIssueId
      })
    })
  })

  test('Reference another issue', async ({ page }) => {
    const firstIssue: NewIssue = {
      title: `First. Reference another issue-${generateId()}`,
      description: 'First. Reference another issue'
    }
    const secondIssue: NewIssue = {
      title: `Second. Reference another issue-${generateId()}`,
      description: 'Second. Reference another issue'
    }
    await leftSideMenuPage.clickTracker()

    const secondIssueId = await prepareNewIssueStep(page, secondIssue)
    const firstIssueId = await prepareNewIssueStep(page, firstIssue)
    await issuesPage.openIssueByName(firstIssue.title)
    await test.step('Reference another issue... and check issue description', async () => {
      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.moreActionOnIssueWithSecondLevel('Relations', 'Reference another issue...')
      await issuesDetailsPage.fillSearchForIssueModal(secondIssue.title)

      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.checkIssue({
        ...firstIssue,
        relatedIssue: secondIssueId
      })
    })

    await test.step('Check the second issue description', async () => {
      await trackerNavigationMenuPage.openIssuesForProject('Default')
      await issuesPage.searchIssueByName(secondIssue.title)
      await issuesPage.openIssueByName(secondIssue.title)
      await issuesDetailsPage.waitDetailsOpened(secondIssue.title)
      await issuesDetailsPage.checkIssue({
        ...secondIssue,
        relatedIssue: firstIssueId
      })
    })
  })

  test('Remove relation be editing issue details', async ({ page }) => {
    const firstIssue: NewIssue = {
      title: `First. Remove relation be editing issue details-${generateId()}`,
      description: 'First. Remove relation be editing issue details'
    }
    const secondIssue: NewIssue = {
      title: `Second. Remove relation be editing issue details-${generateId()}`,
      description: 'Second. Remove relation be editing issue details'
    }
    await leftSideMenuPage.clickTracker()
    const secondIssueId = await prepareNewIssueStep(page, secondIssue)
    await prepareNewIssueStep(page, firstIssue)
    await issuesPage.openIssueByName(firstIssue.title)
    await test.step('Reference another issue... and check issue description', async () => {
      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.moreActionOnIssueWithSecondLevel('Relations', 'Mark as blocked by...')
      await issuesDetailsPage.fillSearchForIssueModal(secondIssue.title)

      await issuesDetailsPage.waitDetailsOpened(firstIssue.title)
      await issuesDetailsPage.checkIssue({
        ...firstIssue,
        blockedBy: secondIssueId
      })

      // delete here
      await issuesDetailsPage.clickRemoveBlockedBy()
      await issuesDetailsPage.checkIfTextBlockedByIsVisible()
    })

    await test.step('Check the second issue description', async () => {
      await trackerNavigationMenuPage.openIssuesForProject('Default')
      await issuesPage.searchIssueByName(secondIssue.title)
      await issuesPage.openIssueByName(secondIssue.title)
      await issuesDetailsPage.waitDetailsOpened(secondIssue.title)
      await issuesDetailsPage.checkIfTextBlockedByIsVisible()
    })
  })
})
