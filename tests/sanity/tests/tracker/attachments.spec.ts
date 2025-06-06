import { test } from '@playwright/test'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewIssue } from '../model/tracker/types'
import { generateId, PlatformSetting, PlatformURI } from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Attachments tests', () => {
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage

  test.beforeEach(async ({ page }) => {
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create issue with several attachment test', async () => {
    const newIssue: NewIssue = {
      title: `Create issue with several attachment tests-${generateId()}`,
      description: 'Create issue with several attachment tests description'
    }

    await trackerNavigationMenuPage.openIssuesForProject('Default')
    await issuesPage.clickModelSelectorAll()
    await issuesPage.clickButtonCreateNewIssue()
    await issuesPage.fillNewIssueForm(newIssue)
    await issuesPage.attachFileToNewIssueForm('cat.jpeg')
    await issuesPage.attachFileToNewIssueForm('cat2.jpeg')
    await issuesPage.clickButtonCreateIssue()
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
    await issuesDetailsPage.checkIssueContainsAttachment('cat.jpeg')
    await issuesDetailsPage.checkIssueContainsAttachment('cat3.jpeg')
    // TODO: It could be execurted a bit faster and activity will not contain necessary entry.
    // await issuesDetailsPage.checkActivityExist('uploaded an attachment')
  })
})
