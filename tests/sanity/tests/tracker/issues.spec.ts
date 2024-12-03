import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { Issue, NewIssue } from '../model/tracker/types'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { prepareNewIssueWithOpenStep } from './common-steps'
import { IssueCommentPopup } from '../model/tracker/issue-comment-popup'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker issue tests', () => {
  let issuesDetailsPage: IssuesDetailsPage
  let issuesPage: IssuesPage
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let issueCommentPopup: IssueCommentPopup

  test.beforeEach(async ({ page }) => {
    issuesDetailsPage = new IssuesDetailsPage(page)
    issuesPage = new IssuesPage(page)
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    issueCommentPopup = new IssueCommentPopup(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create an issue with all parameters and attachments', async ({ page }) => {
    const newIssue: NewIssue = {
      title: `Issue with all parameters and attachments-${generateId()}`,
      description: 'Created issue with all parameters and attachments description',
      status: 'In Progress',
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

    await prepareNewIssueWithOpenStep(page, newIssue)
    await issuesDetailsPage.checkIssue(newIssue)
  })

  test('Edit an issue', async ({ page }) => {
    const newIssue: NewIssue = {
      title: `Issue with all parameters and attachments-${generateId()}`,
      description: 'Created issue with all parameters and attachments description'
    }
    const editIssue: Issue = {
      status: 'Done',
      priority: 'High',
      createLabel: true,
      labels: `EDIT-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '8',
      milestone: 'Milestone',
      duedate: 'today'
    }
    await prepareNewIssueWithOpenStep(page, newIssue)

    await issuesDetailsPage.editIssue(editIssue)

    await issuesDetailsPage.checkIssue({
      ...newIssue,
      ...editIssue
    })

    const estimations = ['0', '1', '1.25', '1.259', '1.26', '1.27', '1.5', '1.75', '2', '7', '8', '9', '9.5']

    for (const input of estimations) {
      await issuesDetailsPage.editIssue({
        estimation: input
      })
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        ...editIssue,
        estimation: input
      })
    }
  })

  test.skip('Set parent issue', async ({ page }) => {
    const parentIssue: NewIssue = {
      title: `PARENT ISSUE-${generateId(2)}`,
      description: 'Created issue to be parent issue'
    }

    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(parentIssue)

    await test.step('Set parent issue during creation', async () => {
      const newIssue: NewIssue = {
        title: `Set parent issue during creation-${generateId(2)}`,
        description: 'Set parent issue during creation',
        parentIssue: parentIssue.title
      }

      await issuesPage.clickModelSelectorAll()
      await issuesPage.createNewIssue(newIssue)
      await issuesPage.searchIssueByName(newIssue.title)

      await issuesPage.checkParentIssue(newIssue.title, parentIssue.title)
      await issuesPage.openIssueByName(newIssue.title)
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        parentIssue: parentIssue.title
      })

      await trackerNavigationMenuPage.openIssuesForProject('Default')
    })

    await test.step('Set parent issue from issues page', async () => {
      const newIssue: NewIssue = {
        title: `Set parent issue from issues page-${generateId(2)}`,
        description: 'Set parent issue from issues page'
      }
      await issuesPage.clickModelSelectorAll()
      await issuesPage.createNewIssue(newIssue)
      await issuesPage.searchIssueByName(newIssue.title)

      await issuesPage.doActionOnIssue(newIssue.title, 'Set parent issue…')
      await issuesPage.selectMenuItem(page, parentIssue.title, true)

      await issuesPage.searchIssueByName(newIssue.title)
      await issuesPage.checkParentIssue(newIssue.title, parentIssue.title)

      await issuesPage.openIssueByName(newIssue.title)
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        parentIssue: parentIssue.title
      })
      await trackerNavigationMenuPage.openIssuesForProject('Default')
    })

    await test.step('Set parent issue from issue details page', async () => {
      const newIssue: NewIssue = {
        title: `Set parent issue from issue details page-${generateId(2)}`,
        description: 'Set parent issue from issue details page'
      }
      await issuesPage.clickModelSelectorAll()
      await issuesPage.createNewIssue(newIssue)
      await issuesPage.searchIssueByName(newIssue.title)
      await issuesPage.openIssueByName(newIssue.title)
      await issuesDetailsPage.moreActionOnIssue('Set parent issue…')
      await issuesPage.selectMenuItem(page, parentIssue.title, true)
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        parentIssue: parentIssue.title
      })
      await trackerNavigationMenuPage.openIssuesForProject('Default')
      await issuesPage.checkParentIssue(newIssue.title, parentIssue.title)
    })
  })

  test('Move to project', async ({ page }) => {
    const secondProjectName = 'Second Project'
    const moveIssue: NewIssue = {
      title: `Issue to another project-${generateId()}`,
      description: 'Issue to move to another project'
    }
    await prepareNewIssueWithOpenStep(page, moveIssue)
    await issuesDetailsPage.moreActionOnIssue('Move to project')
    await issuesDetailsPage.fillMoveIssuesModal(secondProjectName, true)
    await trackerNavigationMenuPage.openIssuesForProject(secondProjectName)
    await issuesPage.openIssueByName(moveIssue.title)
    await issuesDetailsPage.checkIssue({
      ...moveIssue
    })

    await trackerNavigationMenuPage.openIssuesForProject('Default')
    // TODO need to return back after bug with activity fixed
    // await issuesDetailsPage.checkActivityExist('changed project in')
    // await issuesDetailsPage.checkActivityExist('changed number in')
  })

  test('Comment stored after reload the page', async ({ page }) => {
    const commentText = `Comment should be stored after reload-${generateId()}`
    const commentIssue: NewIssue = {
      title: `Issue for stored comment-${generateId()}`,
      description: 'Issue for comment stored after reload the page'
    }
    await prepareNewIssueWithOpenStep(page, commentIssue)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.waitDetailsOpened(commentIssue.title)
    await issuesDetailsPage.addComment(commentText)
    await issuesDetailsPage.checkCommentExist(commentText)

    await page.reload()
    await issuesDetailsPage.waitDetailsOpened(commentIssue.title)
    await issuesDetailsPage.checkCommentExist(commentText)
  })

  test('Create an Issue from template', async ({ page }) => {
    const templateName = 'New Issue'
    const newIssue: NewIssue = {
      title: `New Issue-${generateId(4)}`,
      description: 'New Issue',
      priority: 'Medium',
      estimation: '8',
      component: 'Default component',
      milestone: 'Edit Milestone'
    }
    await issuesPage.clickModelSelectorAll()
    await issuesPage.buttonCreateNewIssue().click()
    await issuesPage.selectTemplate(templateName)
    await expect(issuesPage.buttonPopupCreateNewIssueTemplate()).toHaveText(templateName)
    await issuesPage.fillNewIssueForm({ description: newIssue.description, title: newIssue.title })
    await issuesPage.clickButtonCreateIssue()

    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)
    await issuesDetailsPage.checkIssue(newIssue)
  })

  test('Delete an issue', async ({ page }) => {
    const deleteIssue: NewIssue = {
      title: `Issue-to-delete-${generateId()}`,
      description: 'Description Issue for deletion'
    }
    await prepareNewIssueWithOpenStep(page, deleteIssue)
    await issuesPage.navigateToIssues()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(deleteIssue.title)
    await issuesPage.openIssueByName(deleteIssue.title)
    await issuesDetailsPage.waitDetailsOpened(deleteIssue.title)
    await issuesDetailsPage.moreActionOnIssue('Delete')
    await issuesDetailsPage.pressYesForPopup(page)
    await issuesPage.searchIssueByName(deleteIssue.title)
    await issuesPage.checkIssueNotExist(deleteIssue.title)
  })

  test('Check the changed description activity', async ({ page }) => {
    const additionalDescription = 'New row for the additional description'
    const changedDescriptionIssue: NewIssue = {
      title: `Check the changed description activity-${generateId()}`,
      description: 'Check the changed description activity description'
    }
    await prepareNewIssueWithOpenStep(page, changedDescriptionIssue)
    await issuesDetailsPage.waitDetailsOpened(changedDescriptionIssue.title)
    await issuesDetailsPage.checkIssue(changedDescriptionIssue)
    await issuesDetailsPage.addToDescription(additionalDescription)
    await issuesDetailsPage.openShowMoreLink('changed description')
    await issuesDetailsPage.checkComparingTextAdded(additionalDescription)
  })

  test('Add comment with image attachment', async ({ page }) => {
    const commentImageIssue: NewIssue = {
      title: `Add comment with image attachment-${generateId()}`,
      description: 'Add comment with image attachment'
    }
    await prepareNewIssueWithOpenStep(page, commentImageIssue)
    await issuesDetailsPage.waitDetailsOpened(commentImageIssue.title)
    await issuesDetailsPage.addCommentWithImage('Added comment with atttachment', 'cat3.jpeg')
    await issuesDetailsPage.checkCommentWithImageExist('left a comment', 'cat3.jpeg')
  })

  test('Add comment by popup', async ({ page }) => {
    const commentInside = `Comment for the inside issue-${generateId()}`
    const commentPopup = `Comment for the popup-${generateId()}`
    const commentIssue: NewIssue = {
      title: `Issue for add comment by popup-${generateId()}`,
      description: 'Issue for add comment by popup'
    }
    await prepareNewIssueWithOpenStep(page, commentIssue)
    await issuesDetailsPage.waitDetailsOpened(commentIssue.title)
    await issuesDetailsPage.addComment(commentInside)
    await issuesDetailsPage.checkCommentExist(commentInside)
    await issuesPage.linkSidebarAll().click()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(commentIssue.title)
    await issuesPage.checkCommentsCount(commentIssue.title, '1')
    await issuesPage.openCommentPopupForIssueByName(commentIssue.title)
    await issueCommentPopup.addCommentInPopup(commentPopup, 'cat2.jpeg')
    await issueCommentPopup.checkCommentWithImageExist('left a comment', 'cat2.jpeg')
    await issueCommentPopup.checkCommentExist(commentPopup)
    await page.locator('.modal-overlay').hover({ position: { x: 10, y: 10 } })
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } })
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(commentIssue.title)
    await issuesPage.checkCommentsCount(commentIssue.title, '2')
  })
})
