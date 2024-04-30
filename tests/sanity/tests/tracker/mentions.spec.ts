import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewIssue } from '../model/tracker/types'
import { EmployeeDetailsPage } from '../model/contacts/employee-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Mentions issue tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let employeeDetailsPage: EmployeeDetailsPage

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    employeeDetailsPage = new EmployeeDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('If user mentioned in the issue than he should be added as Collaborators', async () => {
    const mentionIssue: NewIssue = {
      title: `Issue user mentioned as Collaborators-${generateId()}`,
      description: 'Issue user mentioned as Collaborators description'
    }

    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(mentionIssue)
    await issuesPage.searchIssueByName(mentionIssue.title)
    await issuesPage.openIssueByName(mentionIssue.title)

    await issuesDetailsPage.addMentions('Dirak Kainin')
    await issuesDetailsPage.checkCommentExist('@Dirak Kainin')

    await issuesDetailsPage.checkCollaborators(['Appleseed John', 'Dirak Kainin'])
  })

  test('When Change assigner user should be added as Collaborators', async ({ page }) => {
    const mentionIssue: NewIssue = {
      title: `When Change assigner user should be added as Collaborators-${generateId()}`,
      description: 'When Change assigner user should be added as Collaborators description'
    }

    await leftSideMenuPage.clickTracker()

    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(mentionIssue)
    await issuesPage.searchIssueByName(mentionIssue.title)
    await issuesPage.openIssueByName(mentionIssue.title)

    await issuesDetailsPage.editIssue({ assignee: 'Dirak Kainin' })
    await issuesDetailsPage.checkIssue({
      ...mentionIssue,
      assignee: 'Dirak Kainin'
    })
    await issuesDetailsPage.checkActivityContentExist('Assignee set to Dirak Kainin')
    await issuesDetailsPage.checkCollaboratorsCount('2 members')
    await issuesDetailsPage.checkCollaborators(['Appleseed John', 'Dirak Kainin'])
  })

  test('Check that the backlink shown in the Issue activity', async ({ page }) => {
    const mentionName = 'Dirak Kainin'
    const backlinkIssue: NewIssue = {
      title: `Check that the backlink shown in the Contact activity-${generateId()}`,
      description: 'Check that the backlink shown in the Contact activity description'
    }
    await leftSideMenuPage.clickTracker()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.createNewIssue(backlinkIssue)
    await issuesPage.searchIssueByName(backlinkIssue.title)
    await issuesPage.openIssueByName(backlinkIssue.title)

    await issuesDetailsPage.checkActivityContentExist(`New issue: ${backlinkIssue.title}`)
    await issuesDetailsPage.openLinkFromActivitiesByText(backlinkIssue.title)
    await issuesDetailsPage.checkIssue(backlinkIssue)

    await issuesDetailsPage.addMentions(mentionName)
    await issuesDetailsPage.checkCommentExist(`@${mentionName}`)
    await issuesDetailsPage.openLinkFromActivitiesByText(mentionName)

    await employeeDetailsPage.checkEmployee({
      firstName: mentionName.split(' ')[1],
      lastName: mentionName.split(' ')[0]
    })
  })
})
