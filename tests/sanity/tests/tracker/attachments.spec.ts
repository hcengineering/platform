import { test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewIssue } from '../model/tracker/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Attachments tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create issue with several attachment test', async ({ page }) => {
    const newIssue: NewIssue = {
      title: `Create issue with several attachment tests-${generateId()}`,
      description: 'Create issue with several attachment tests description'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openIssuesForProject('Default')

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()

    await issuesPage.buttonCreateNewIssue.click()
    await issuesPage.fillNewIssueForm(newIssue)
    await issuesPage.attachFileToNewIssueForm('cat.jpeg')
    await issuesPage.attachFileToNewIssueForm('cat2.jpeg')
    await issuesPage.buttonCreateIssue.click()

    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.checkAttachmentsCount(newIssue.title, '2')

    await test.step('Add attachments in the popup', async () => {
      await issuesPage.checkAddAttachmentPopupContainsFile(newIssue.title, 'cat.jpeg')
      await issuesPage.checkAddAttachmentPopupContainsFile(newIssue.title, 'cat2.jpeg')

      await issuesPage.addAttachmentToIssue(newIssue.title, 'cat3.jpeg')
      await issuesPage.checkAddAttachmentPopupContainsFile(newIssue.title, 'cat.jpeg')
      await issuesPage.checkAddAttachmentPopupContainsFile(newIssue.title, 'cat2.jpeg')

      await issuesPage.checkAttachmentsCount(newIssue.title, '3')
    })

    await test.step('Delete attachments in the popup', async () => {
      await issuesPage.deleteAttachmentToIssue(newIssue.title, 'cat2.jpeg')
      await issuesPage.checkAddAttachmentPopupContainsFile(newIssue.title, 'cat.jpeg')
      await issuesPage.checkAddAttachmentPopupContainsFile(newIssue.title, 'cat3.jpeg')

      await issuesPage.checkAttachmentsCount(newIssue.title, '2')
    })

    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.checkIssueContainsAttachment('cat.jpeg')
    await issuesDetailsPage.checkIssueContainsAttachment('cat3.jpeg')
    await issuesDetailsPage.checkActivityExist('uploaded an attachment')
  })
})
