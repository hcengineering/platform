import { expect, test } from '@playwright/test'
import { IssuesPage } from '../model/tracker/issues-page'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import {
  checkIssue,
  checkIssueDraft,
  createIssue,
  DEFAULT_STATUSES,
  DEFAULT_USER,
  fillIssueForm,
  navigate
} from './tracker.utils'
import { Issue, NewIssue } from '../model/tracker/types'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { CommonTrackerPage } from '../model/tracker/common-tracker-page'

test.use({
  storageState: PlatformSetting
})
test.describe('Tracker sub-issues tests', () => {
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let commonTrackerPage: CommonTrackerPage

  test.beforeEach(async ({ page }) => {
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    commonTrackerPage = new CommonTrackerPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create sub-issue', async ({ page }) => {
    await commonTrackerPage.clickOnApplicationButton()
    const props = {
      name: `issue-${generateId(5)}`,
      description: 'description',
      status: DEFAULT_STATUSES[1],
      priority: 'Urgent',
      assignee: DEFAULT_USER
    }
    await navigate(page)
    await createIssue(page, props)
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(props.name)
    await issuesPage.openIssueByName(props.name)
    await checkIssue(page, props)
    props.name = `sub${props.name}`
    await issuesPage.clickOnSubIssues()
    await fillIssueForm(page, props)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await issuesPage.clickOnNewIssue()
    await checkIssueDraft(page, props)
  })

  test('Edit a sub-issue', async () => {
    const newIssue: NewIssue = {
      title: `Issue for the sub-issue-${generateId()}`,
      description: 'Description Issue for the sub-issue'
    }
    const newSubIssue: NewIssue = {
      title: `New Sub-Issue with parameter-${generateId()}`,
      description: 'New Description Sub-Issue with parameter'
    }
    const editSubIssue: Issue = {
      status: 'In Progress',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      createLabel: true,
      labels: `EDIT-SUB-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '8',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }

    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)
    await issuesDetailsPage.clickButtonAddSubIssue()

    await issuesPage.fillNewIssueForm(newSubIssue)
    await issuesPage.clickButtonCreateIssue()
    await issuesDetailsPage.openSubIssueByName(newSubIssue.title)

    await issuesDetailsPage.waitDetailsOpened(newSubIssue.title)
    await issuesDetailsPage.editIssue(editSubIssue)
    await issuesDetailsPage.checkIssue({
      ...newSubIssue,
      ...editSubIssue,
      parentIssue: newIssue.title
    })
  })

  test('Delete a sub-issue', async ({ page }) => {
    const deleteIssue: NewIssue = {
      title: `Issue for the delete sub-issue-${generateId()}`,
      description: 'Description Issue for the delete sub-issue'
    }
    const deleteSubIssue: NewIssue = {
      title: `Delete Sub-Issue with parameter-${generateId()}`,
      description: 'Delete Description Sub-Issue with parameter'
    }
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(deleteIssue)
    await issuesPage.searchIssueByName(deleteIssue.title)
    await issuesPage.openIssueByName(deleteIssue.title)
    await issuesDetailsPage.clickButtonAddSubIssue()

    await issuesPage.fillNewIssueForm(deleteSubIssue)
    await issuesPage.clickButtonCreateIssue()
    await issuesDetailsPage.openSubIssueByName(deleteSubIssue.title)

    await issuesDetailsPage.waitDetailsOpened(deleteSubIssue.title)
    await issuesDetailsPage.checkIssue({
      ...deleteSubIssue,
      parentIssue: deleteIssue.title
    })

    await issuesDetailsPage.moreActionOnIssue('Delete')
    await issuesDetailsPage.pressYesForPopup(page)

    await issuesPage.searchIssueByName(deleteSubIssue.title)
    await issuesPage.checkIssueNotExist(deleteSubIssue.title)
  })

  test('Create sub-issue from template', async ({ page }) => {
    const parentIssue: NewIssue = {
      title: `Parent issue for the Create sub-issue from template-${generateId()}`,
      description: 'Create sub-issue from template'
    }
    const subIssue: NewIssue = {
      title: `Create sub-issue from template-${generateId()}`,
      description: 'Create sub-issue from template'
    }
    const templateName = 'New Issue'
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(parentIssue)
    await issuesPage.searchIssueByName(parentIssue.title)
    await issuesPage.openIssueByName(parentIssue.title)
    await issuesDetailsPage.moreActionOnIssue('Add sub-issue...')
    await issuesPage.selectTemplate(templateName)
    await expect(issuesPage.buttonPopupCreateNewIssueTemplate()).toHaveText(templateName)
    await issuesPage.fillNewIssueForm(subIssue)
    await issuesPage.clickButtonCreateIssue()

    await issuesDetailsPage.openSubIssueByName(subIssue.title)
    await issuesDetailsPage.waitDetailsOpened(subIssue.title)
    await issuesDetailsPage.checkIssue({
      ...subIssue,
      parentIssue: parentIssue.title
    })
  })

  test('Sub-issues move with parent issue', async ({ page }) => {
    const secondProjectName = 'Second Project'
    const newIssue: NewIssue = {
      title: `Issue for the sub-issue-${generateId()}`,
      description: 'Description Issue for the sub-issue'
    }
    const newSubIssue: NewIssue = {
      title: `New Sub-Issue with parameter-${generateId()}`,
      description: 'New Description Sub-Issue with parameter'
    }

    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)
    await issuesDetailsPage.clickButtonAddSubIssue()

    await issuesPage.fillNewIssueForm(newSubIssue)
    await issuesPage.clickButtonCreateIssue()

    await issuesDetailsPage.moreActionOnIssue('Move to project')
    await issuesDetailsPage.fillMoveIssuesModal(secondProjectName)
    await page.waitForTimeout(1500)
    await issuesDetailsPage.openSubIssueByName(newSubIssue.title)
    await expect(issuesDetailsPage.textIdentifier()).toHaveText(/SECON-\d+/)
  })
})
