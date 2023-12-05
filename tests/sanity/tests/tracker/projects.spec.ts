import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewProjectPage } from '../model/tracker/new-project-page'
import { NewProject } from '../model/tracker/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker Projects tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Tracker tests')
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create project', async ({ page }) => {
    const newProjectData: NewProject = {
      title: 'TestProject',
      identifier: 'QWERT',
      description: 'Test Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.checkProjectNotExist(newProjectData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()

    const newProjectPage = new NewProjectPage(page)
    await newProjectPage.createNewProject(newProjectData)
    await trackerNavigationMenuPage.checkProjectExist(newProjectData.title)

    await trackerNavigationMenuPage.openProject(newProjectData.title)
  })
})
