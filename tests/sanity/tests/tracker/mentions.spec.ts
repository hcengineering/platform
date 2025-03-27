import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewIssue } from '../model/tracker/types'
import { EmployeeDetailsPage } from '../model/contacts/employee-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Mentions issue tests', () => {
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let employeeDetailsPage: EmployeeDetailsPage

  test.beforeEach(async ({ page }) => {
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

  test('Checking backlinks in different spaces', async ({ page }) => {
    const backlinkIssueDefault: NewIssue = {
      title: `Issue for Default project-${generateId()}`,
      description: 'Description',
      projectName: 'Default'
    }
    const backlinkIssueSecond: NewIssue = {
      title: `Issue for Second project-${generateId()}`,
      description: 'Description',
      projectName: 'Second Project'
    }
    await issuesPage.createNewIssue(backlinkIssueDefault)
    await issuesPage.createNewIssue(backlinkIssueSecond)
    const issuesNavigationPage = new TrackerNavigationMenuPage(page)
    await issuesNavigationPage.issuesLinkForProject(backlinkIssueDefault.projectName ?? '').click()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(backlinkIssueDefault.title)
    await issuesPage.checkRowsInListExist(backlinkIssueDefault.title)
    const defaultId = await issuesPage.getIssueId(backlinkIssueDefault.title)
    await issuesNavigationPage.issuesLinkForProject(backlinkIssueSecond.projectName ?? '').click()
    await issuesPage.clickModelSelectorAll()
    await issuesPage.searchIssueByName(backlinkIssueSecond.title)
    await issuesPage.checkRowsInListExist(backlinkIssueSecond.title)
    const secondId = await issuesPage.getIssueId(backlinkIssueSecond.title)
    await issuesPage.openIssueByName(backlinkIssueSecond.title)
    await issuesDetailsPage.addMentions(defaultId)
    await issuesDetailsPage.checkCommentExist(defaultId)
    await issuesDetailsPage.openLinkFromActivitiesByText(defaultId)
    await issuesDetailsPage.checkIssue(backlinkIssueDefault)
    await issuesDetailsPage.addMentions(secondId)
    await issuesDetailsPage.checkCommentExist(secondId)
    await issuesDetailsPage.openLinkFromActivitiesByText(secondId)
    await issuesDetailsPage.checkIssue(backlinkIssueSecond)
    await issuesDetailsPage.clickCloseIssueButton()
  })
})
