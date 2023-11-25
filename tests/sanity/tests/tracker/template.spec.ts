import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { Issue, NewIssue } from '../model/tracker/types'
import { allure } from 'allure-playwright'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { TemplatePage } from '../model/tracker/templates-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker template tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Tracker tests')
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a Template', async ({ page }) => {
    const newTemplate: NewIssue = {
      title: `Issue with all parameters and attachments-${generateId()}`,
      description: 'Created issue with all parameters and attachments description',
      priority: 'Urgent',
      assignee: 'Dirak Kainin',
      createLabel: true,
      labels: `CREATE-TEMPLATE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.buttonTemplates.click()

    const templatePage = new TemplatePage(page)
    await templatePage.createNewTemplate(newTemplate)

    // const issuesDetailsPage = new IssuesDetailsPage(page)
    // await issuesDetailsPage.checkIssue({
    //   ...newTemplate,
    //   milestone: 'Milestone',
    //   estimation: '2h'
    // })
  })

})
