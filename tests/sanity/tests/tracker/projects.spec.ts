import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewProjectPage } from '../model/tracker/new-project-page'
import { NewProject } from '../model/tracker/types'
import { EditProjectPage } from '../model/tracker/edit-project-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker Projects tests', () => {
  test.beforeEach(async ({ page }) => {
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

  test('Edit project', async ({ page }) => {
    const editProjectData: NewProject = {
      title: 'EditProject',
      identifier: 'EDIT',
      description: 'Edit Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }
    const updateProjectData: NewProject = {
      title: 'UpdateProject',
      identifier: 'EDIT',
      description: 'Updated Project description',
      private: true,
      defaultAssigneeForIssues: 'Chen Rosamund',
      defaultIssueStatus: 'Done'
    }

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.checkProjectNotExist(editProjectData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()

    const newProjectPage = new NewProjectPage(page)
    await newProjectPage.createNewProject(editProjectData)
    await trackerNavigationMenuPage.checkProjectExist(editProjectData.title)

    await trackerNavigationMenuPage.makeActionWithProject(editProjectData.title, 'Edit project')

    const editProjectPage = new EditProjectPage(page)
    await editProjectPage.checkProject(editProjectData)

    await editProjectPage.updateProject(updateProjectData)
    await trackerNavigationMenuPage.makeActionWithProject(updateProjectData.title, 'Edit project')
    await editProjectPage.checkProject(updateProjectData)
  })

  test('Archive Project', async ({ page }) => {
    const archiveProjectData: NewProject = {
      title: 'PROJECT_ARCHIVE',
      identifier: 'ARCH',
      description: 'Archive Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    const trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()

    const newProjectPage = new NewProjectPage(page)
    await newProjectPage.createNewProject(archiveProjectData)
    await trackerNavigationMenuPage.checkProjectExist(archiveProjectData.title)

    await trackerNavigationMenuPage.makeActionWithProject(archiveProjectData.title, 'Archive')
    await trackerNavigationMenuPage.pressYesForPopup(page)

    await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
  })
})
