import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewProjectPage } from '../model/tracker/new-project-page'
import { NewProject } from '../model/tracker/types'
import { EditProjectPage } from '../model/tracker/edit-project-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker Projects tests', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Tracker tests')
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test.skip('Create project', async ({ page }) => {
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

  test('Edit project', async ({ page }) => {
    const editProjectData: NewProject = {
      title: 'EditProject',
      identifier: 'EDIT',
      description: 'Edit Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'Done'
    }

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    // await trackerNavigationMenuPage.checkProjectNotExist(editProjectData.title)
    // await trackerNavigationMenuPage.pressCreateProjectButton()
    //
    // const newProjectPage = new NewProjectPage(page)
    // await newProjectPage.createNewProject(editProjectData)
    await trackerNavigationMenuPage.checkProjectExist(editProjectData.title)

    await trackerNavigationMenuPage.openProjectToEdit(editProjectData.title)

    const editProjectPage = new EditProjectPage(page)
    await editProjectPage.checkProject(editProjectData)

  })
})
