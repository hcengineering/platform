import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'
import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
import { NewProjectPage } from '../model/tracker/new-project-page'
import { NewProject } from '../model/tracker/types'
import { EditProjectPage } from '../model/tracker/edit-project-page'
import { AllProjectsPage } from '../model/tracker/all-projects-page'
import { generateProjectId } from './tracker.utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Tracker Projects tests', () => {
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

  test('User can create project', async () => {
    const projectId = generateProjectId()
    const newProjectData: NewProject = {
      title: `NewProject-${projectId}`,
      identifier: projectId,
      description: 'New Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    await test.step('User create project', async () => {
      await trackerNavigationMenuPage.checkProjectNotExist(newProjectData.title)
      await trackerNavigationMenuPage.pressCreateProjectButton()
      await newProjectPage.createNewProject(newProjectData)
    })

    await test.step('User see project in menu', async () => {
      await trackerNavigationMenuPage.checkProjectExist(newProjectData.title)
    })

    await test.step('User see project in all projects table', async () => {
      await trackerNavigationMenuPage.openAllProjects()
      await allProjectsPage.checkProjectExistInTable(newProjectData.title)
    })

    await test.step('User can open created project', async () => {
      await trackerNavigationMenuPage.openProject(newProjectData.title)
    })
  })

  test('User can edit project', async () => {
    const projectId = generateProjectId()

    const editProjectData: NewProject = {
      title: `EditProject-${projectId}`,
      identifier: projectId,
      description: 'Edit Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }
    const updateProjectData: NewProject = {
      title: `UpdateProject-${projectId}`,
      identifier: projectId,
      description: 'Updated Project description',
      private: true,
      defaultAssigneeForIssues: 'Chen Rosamund',
      defaultIssueStatus: 'Done'
    }

    await test.step('User prepare project', async () => {
      await trackerNavigationMenuPage.checkProjectNotExist(editProjectData.title)
      await trackerNavigationMenuPage.pressCreateProjectButton()
      await newProjectPage.createNewProject(editProjectData)
      await trackerNavigationMenuPage.checkProjectExist(editProjectData.title)
    })

    await test.step('User edit project', async () => {
      await trackerNavigationMenuPage.makeActionWithProject(editProjectData.title, 'Edit project')
      await editProjectPage.checkProject(editProjectData)
      await editProjectPage.updateProject(updateProjectData)
      await trackerNavigationMenuPage.makeActionWithProject(updateProjectData.title, 'Edit project')
      await editProjectPage.checkProject(updateProjectData)
      await editProjectPage.buttonSaveProject().click()
    })
  })

  test('User can archive and unarchive Project', async ({ page }) => {
    const projectId = generateProjectId()

    const archiveProjectData: NewProject = {
      title: `ArchiveProject-${projectId}`,
      identifier: projectId,
      description: 'Archive Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    await test.step('User prepare project', async () => {
      await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
      await trackerNavigationMenuPage.pressCreateProjectButton()
      await newProjectPage.createNewProject(archiveProjectData)
    })

    await test.step('User archive project', async () => {
      await trackerNavigationMenuPage.checkProjectExist(archiveProjectData.title)
      await trackerNavigationMenuPage.makeActionWithProject(archiveProjectData.title, 'Archive')
      await trackerNavigationMenuPage.pressYesForPopup(page)
      await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
      await trackerNavigationMenuPage.openAllProjects()
      await allProjectsPage.checkProjectExistInTable(`${archiveProjectData.title} (archived)`)
    })

    await test.step('User unarchive project', async () => {
      await allProjectsPage.unarchiveProject(archiveProjectData.title)
      await allProjectsPage.checkProjecInTableIsNotArchived(`${archiveProjectData.title}`)
      await trackerNavigationMenuPage.checkProjectExist(archiveProjectData.title)
    })

    await test.step('Finally archive project again', async () => {
      await trackerNavigationMenuPage.makeActionWithProject(archiveProjectData.title, 'Archive')
      await trackerNavigationMenuPage.pressYesForPopup(page)
      await trackerNavigationMenuPage.checkProjectNotExist(archiveProjectData.title)
    })
  })

  test('Star and Unstar Project', async () => {
    const projectId = generateProjectId()

    const projectToStarData: NewProject = {
      title: `ProjectToStar-${projectId}`,
      identifier: projectId,
      description: 'Starred Project description',
      private: true,
      defaultAssigneeForIssues: 'Dirak Kainin',
      defaultIssueStatus: 'In Progress'
    }

    await test.step('User prepare project', async () => {
      await trackerNavigationMenuPage.checkProjectNotExist(projectToStarData.title)
      await trackerNavigationMenuPage.pressCreateProjectButton()
      await newProjectPage.createNewProject(projectToStarData)
      await trackerNavigationMenuPage.checkProjectExist(projectToStarData.title)
    })

    await test.step('User star project', async () => {
      await trackerNavigationMenuPage.makeActionWithProject(projectToStarData.title, 'Star')
      await trackerNavigationMenuPage.checkProjectStarred(projectToStarData.title)
      await trackerNavigationMenuPage.checkProjectWillBeRemovedFromYours(projectToStarData.title)
    })

    await test.step('User unstar project', async () => {
      await trackerNavigationMenuPage.makeActionWithStarredProject(projectToStarData.title, 'Unstar')
      await trackerNavigationMenuPage.checkProjectExist(projectToStarData.title)
      await trackerNavigationMenuPage.checkProjectWillBeRemovedFromStarred(projectToStarData.title)
    })
  })

  test('Leave and Join Project', async () => {
    const projectId = generateProjectId()

    const projectToLeaveData: NewProject = {
      title: `ProjectToLeave-${projectId}`,
      identifier: projectId,
      description: 'Project to leave description',
      private: true,
      defaultAssigneeForIssues: 'Appleseed John',
      defaultIssueStatus: 'In Progress'
    }

    await test.step('User prepare project', async () => {
      await trackerNavigationMenuPage.checkProjectNotExist(projectToLeaveData.title)
      await trackerNavigationMenuPage.pressCreateProjectButton()
      await newProjectPage.createNewProject(projectToLeaveData)
      await trackerNavigationMenuPage.checkProjectExist(projectToLeaveData.title)
    })

    await test.step('User leave project', async () => {
      await trackerNavigationMenuPage.makeActionWithProject(projectToLeaveData.title, 'Leave')
      await trackerNavigationMenuPage.checkProjectWillBeRemovedFromYours(projectToLeaveData.title)
    })

    await test.step('User join project', async () => {
      await trackerNavigationMenuPage.openAllProjects()
      await allProjectsPage.checkProjectExistInTable(projectToLeaveData.title)
      await allProjectsPage.joinProject(projectToLeaveData.title)
      await trackerNavigationMenuPage.checkProjectExist(projectToLeaveData.title)
    })
  })

  test.afterEach(async () => {
    await trackerNavigationMenuPage.openIssuesForProject('Default')
  })
})
