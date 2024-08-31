import { test } from '@playwright/test'
import { generateProjectPrefix, PlatformSetting, PlatformURI } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewProjectPage } from '../model/tracker/new-project-page'
import { NewProject } from '../model/tracker/types'
import { EditProjectPage } from '../model/tracker/edit-project-page'
import { AllProjectsPage } from '../model/tracker/all-projects-page'

test.use({
  storageState: PlatformSetting
})

test.describe.only('Tracker Projects tests', () => {
  let trackerNavigationMenuPage: TrackerNavigationMenuPage
  let newProjectPage: NewProjectPage
  let editProjectPage: EditProjectPage
  let allProjectsPage: AllProjectsPage

  test.beforeEach(async ({ page }) => {
    trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    newProjectPage = new NewProjectPage(page)
    editProjectPage = new EditProjectPage(page)
    allProjectsPage = new AllProjectsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create project', async () => {
    const prefix = generateProjectPrefix()
    const newProjectData: NewProject = {
      title: `${prefix}-NewProject`,
      identifier: prefix,
      description: 'New Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    await trackerNavigationMenuPage.checkProjectNotExist(newProjectData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()
    await newProjectPage.createNewProject(newProjectData)
    await trackerNavigationMenuPage.checkProjectExist(newProjectData.title)

    await trackerNavigationMenuPage.openProject(newProjectData.title)
  })

  test('Edit project', async () => {
    const prefix = generateProjectPrefix()

    const editProjectData: NewProject = {
      title: `${prefix}-EditProject`,
      identifier: prefix,
      description: 'Edit Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }
    const updateProjectData: NewProject = {
      title: `${prefix}-UpdateProject`,
      identifier: prefix,
      description: 'Updated Project description',
      private: true,
      defaultAssigneeForIssues: 'Chen Rosamund',
      defaultIssueStatus: 'Done'
    }

    await trackerNavigationMenuPage.checkProjectNotExist(editProjectData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()
    await newProjectPage.createNewProject(editProjectData)
    await trackerNavigationMenuPage.checkProjectExist(editProjectData.title)
    await trackerNavigationMenuPage.makeActionWithProject(editProjectData.title, 'Edit project')
    await editProjectPage.checkProject(editProjectData)
    await editProjectPage.updateProject(updateProjectData)
    await trackerNavigationMenuPage.makeActionWithProject(updateProjectData.title, 'Edit project')
    await editProjectPage.checkProject(updateProjectData)
  })

  test('Archive Project', async ({ page }) => {
    const prefix = generateProjectPrefix()

    const archiveProjectData: NewProject = {
      title: `${prefix}-ArchiveProject`,
      identifier: prefix,
      description: 'Archive Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()
    await newProjectPage.createNewProject(archiveProjectData)
    await trackerNavigationMenuPage.checkProjectExist(archiveProjectData.title)
    await trackerNavigationMenuPage.makeActionWithProject(archiveProjectData.title, 'Archive')
    await trackerNavigationMenuPage.pressYesForPopup(page)
    await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
  })

  test('Star and Unstar Project', async ({ page }) => {
    const prefix = generateProjectPrefix()

    const projectToStarData: NewProject = {
      title: `${prefix}-ProjectToStar`,
      identifier: prefix,
      description: 'Starred Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    await trackerNavigationMenuPage.checkProjectNotExist(projectToStarData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()
    await newProjectPage.createNewProject(projectToStarData)
    await trackerNavigationMenuPage.checkProjectExist(projectToStarData.title)

    await trackerNavigationMenuPage.makeActionWithProject(projectToStarData.title, 'Star')
    await trackerNavigationMenuPage.checkProjectStarred(projectToStarData.title)
    await trackerNavigationMenuPage.checkProjectWillBeRemovedFromYours(projectToStarData.title)

    await trackerNavigationMenuPage.makeActionWithStarredProject(projectToStarData.title, 'Unstar')
    await trackerNavigationMenuPage.checkProjectExist(projectToStarData.title)
    await trackerNavigationMenuPage.checkProjectWillBeRemovedFromStarred(projectToStarData.title)
  })

  test('Leave and Join Project', async ({ page }) => {
    const prefix = generateProjectPrefix()

    const projectToLeaveData: NewProject = {
      title: `${prefix}-ProjectToLeave`,
      identifier: prefix,
      description: 'Project to leave description',
      private: true,
      defaultAssigneeForIssues: 'Appleseed John',
      defaultIssueStatus: 'In Progress'
    }

    await trackerNavigationMenuPage.checkProjectNotExist(projectToLeaveData.title)
    await trackerNavigationMenuPage.pressCreateProjectButton()
    await newProjectPage.createNewProject(projectToLeaveData)
    await trackerNavigationMenuPage.checkProjectExist(projectToLeaveData.title)

    await trackerNavigationMenuPage.makeActionWithProject(projectToLeaveData.title, 'Leave')
    await trackerNavigationMenuPage.checkProjectWillBeRemovedFromYours(projectToLeaveData.title)

    await trackerNavigationMenuPage.openAllProjects()
    await allProjectsPage.checkProjectExistInTable(projectToLeaveData.title)
    await allProjectsPage.joinProject(projectToLeaveData.title)
    await trackerNavigationMenuPage.checkProjectExist(projectToLeaveData.title)
  })

})
