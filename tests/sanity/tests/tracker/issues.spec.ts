import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { Issue, NewIssue } from '../model/tracker/types'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker issue tests', () => {
  test.beforeEach(async ({ page }) => {
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.editIssue(editIssue)

    await issuesDetailsPage.checkIssue({
      ...newIssue,
      ...editIssue,
      estimation: '1d'
    })

    const estimations = new Map([
      ['0', '0h'],
      ['1', '1h'],
      ['1.25', '1h 15m'],
      ['1.259', '1h 15m'],
      ['1.26', '1h 15m'],
      ['1.27', '1h 16m'],
      ['1.5', '1h 30m'],
      ['1.75', '1h 45m'],
      ['2', '2h'],
      ['7', '7h'],
      ['8', '1d'],
      ['9', '1d 1h'],
      ['9.5', '1d 1h 30m']
    ])

    for (const [input, expected] of estimations.entries()) {
      await issuesDetailsPage.editIssue({
        estimation: input
      })
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        ...editIssue,
        estimation: expected
      })
    }
  })

  test.skip('Set parent issue', async ({ page }) => {
    const parentIssue: NewIssue = {
      title: `PARENT ISSUE-${generateId(2)}`,
      description: 'Created issue to be parent issue'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(parentIssue)

    await test.step('Set parent issue during creation', async () => {
      const newIssue: NewIssue = {
        title: `Set parent issue during creation-${generateId(2)}`,
        description: 'Set parent issue during creation',
        parentIssue: parentIssue.title
      }

      await issuesPage.modelSelectorAll.click()
      await issuesPage.createNewIssue(newIssue)
      await issuesPage.searchIssueByName(newIssue.title)

      await issuesPage.checkParentIssue(newIssue.title, parentIssue.title)
      await issuesPage.openIssueByName(newIssue.title)
      const issuesDetailsPage = new IssuesDetailsPage(page)
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        parentIssue: parentIssue.title
      })

      const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
      await trackerNavigationMenuPage.openIssuesForProject('Default')
    })

    await test.step('Set parent issue from issues page', async () => {
      const newIssue: NewIssue = {
        title: `Set parent issue from issues page-${generateId(2)}`,
        description: 'Set parent issue from issues page'
      }
      await issuesPage.modelSelectorAll.click()
      await issuesPage.createNewIssue(newIssue)
      await issuesPage.searchIssueByName(newIssue.title)

      await issuesPage.doActionOnIssue(newIssue.title, 'Set parent issue…')
      await issuesPage.selectMenuItem(page, parentIssue.title, true)

      await issuesPage.searchIssueByName(newIssue.title)
      await issuesPage.checkParentIssue(newIssue.title, parentIssue.title)

      await issuesPage.openIssueByName(newIssue.title)
      const issuesDetailsPage = new IssuesDetailsPage(page)
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        parentIssue: parentIssue.title
      })

      const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
      await trackerNavigationMenuPage.openIssuesForProject('Default')
    })

    await test.step('Set parent issue from issue details page', async () => {
      const newIssue: NewIssue = {
        title: `Set parent issue from issue details page-${generateId(2)}`,
        description: 'Set parent issue from issue details page'
      }
      await issuesPage.modelSelectorAll.click()
      await issuesPage.createNewIssue(newIssue)
      await issuesPage.searchIssueByName(newIssue.title)
      await issuesPage.openIssueByName(newIssue.title)

      const issuesDetailsPage = new IssuesDetailsPage(page)

      await issuesDetailsPage.moreActionOnIssue('Set parent issue…')
      await issuesPage.selectMenuItem(page, parentIssue.title, true)
      await issuesDetailsPage.checkIssue({
        ...newIssue,
        parentIssue: parentIssue.title
      })

      const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openIssuesForProject('Default')

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(moveIssue)
    await issuesPage.searchIssueByName(moveIssue.title)
    await issuesPage.openIssueByName(moveIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.moreActionOnIssue('Move to project')
    await issuesDetailsPage.fillMoveIssuesModal(secondProjectName, true)

    await trackerNavigationMenuPage.openIssuesForProject(secondProjectName)

    await issuesPage.openIssueByName(moveIssue.title)
    await issuesDetailsPage.checkIssue({
      ...moveIssue
    })
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openIssuesForProject('Default')

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(commentIssue)
    await issuesPage.searchIssueByName(commentIssue.title)
    await issuesPage.openIssueByName(commentIssue.title)

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
      estimation: '1d',
      component: 'Default component',
      milestone: 'Edit Milestone'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.openIssuesForProject('Default')

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.buttonCreateNewIssue.click()
    await issuesPage.selectTemplate(templateName)
    await expect(issuesPage.buttonPopupCreateNewIssueTemplate).toHaveText(templateName)
    await issuesPage.fillNewIssueForm({ description: newIssue.description, title: newIssue.title })
    await issuesPage.buttonCreateIssue.click()

    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.checkIssue(newIssue)
  })

  test('Delete an issue', async ({ page }) => {
    const deleteIssue: NewIssue = {
      title: 'Issue for deletion',
      description: 'Description Issue for deletion'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.searchIssueByName(deleteIssue.title)
    await issuesPage.openIssueByName(deleteIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(changedDescriptionIssue)
    await issuesPage.searchIssueByName(changedDescriptionIssue.title)
    await issuesPage.openIssueByName(changedDescriptionIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.modelSelectorAll.click()
    await issuesPage.createNewIssue(commentImageIssue)
    await issuesPage.searchIssueByName(commentImageIssue.title)
    await issuesPage.openIssueByName(commentImageIssue.title)

    const issuesDetailsPage = new IssuesDetailsPage(page)
    await issuesDetailsPage.waitDetailsOpened(commentImageIssue.title)
    await issuesDetailsPage.addCommentWithImage('Added comment with atttachment', 'cat3.jpeg')
    await issuesDetailsPage.checkCommentWithImageExist('left a comment', 'cat3.jpeg')
  })
})
