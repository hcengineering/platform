import { test } from '@playwright/test'
import { generateRandomPrefix, PlatformSetting, PlatformURI } from '../utils'
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

  test('User can create project', async () => {
    const prefix = generateRandomPrefix()
    const newProjectData: NewProject = {
      title: `${prefix}-NewProject`,
      identifier: prefix,
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
    const prefix = generateRandomPrefix()

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
    })
  })

  test('User can archive and unarchive Project', async ({ page }) => {
    const prefix = generateRandomPrefix()

    const archiveProjectData: NewProject = {
      title: `${prefix}-ArchiveProject`,
      identifier: prefix,
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
  })

  test('Star and Unstar Project', async ({ page }) => {
    const prefix = generateRandomPrefix()

    const projectToStarData: NewProject = {
      title: `${prefix}-ProjectToStar`,
      identifier: prefix,
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

  test('Leave and Join Project', async ({ page }) => {
    const prefix = generateRandomPrefix()

    const projectToLeaveData: NewProject = {
      title: `${prefix}-ProjectToLeave`,
      identifier: prefix,
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
})
