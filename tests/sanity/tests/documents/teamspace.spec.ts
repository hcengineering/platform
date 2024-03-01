import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NewTeamspace } from '../model/documents/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentsPage } from '../model/documents/documents-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Teamspace tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a teamspace', async ({ page }) => {
    const newTeamspace: NewTeamspace = {
      title: `New Teamspace-${generateId()}`,
      description: 'New Teamspace description',
      private: false
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.checkTeamspaceNotExist(newTeamspace.title)
    await documentsPage.createNewTeamspace(newTeamspace)
    await documentsPage.checkTeamspaceExist(newTeamspace.title)
  })

  test('Archive teamspace', async ({ page }) => {
    const archiveTeamspace: NewTeamspace = {
      title: 'Teamspace for archive'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.checkTeamspaceExist(archiveTeamspace.title)

    await documentsPage.moreActionTeamspace(archiveTeamspace.title, 'Archive')
    await documentsPage.pressYesForPopup(page)

    await documentsPage.checkTeamspaceNotExist(archiveTeamspace.title)
  })

  test('Edit teamspace', async ({ page }) => {
    const editTeamspace: NewTeamspace = {
      title: `Edit Teamspace-${generateId()}`,
      description: 'Edit Teamspace description',
      private: false
    }
    const updateEditTeamspace: NewTeamspace = {
      title: `Edit Updated Teamspace-${generateId()}`,
      description: 'Edit Updated Teamspace description',
      private: false
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.checkTeamspaceNotExist(editTeamspace.title)
    await documentsPage.createNewTeamspace(editTeamspace)
    await documentsPage.checkTeamspaceExist(editTeamspace.title)

    await documentsPage.moreActionTeamspace(editTeamspace.title, 'Edit teamspace')

    await documentsPage.editTeamspace(updateEditTeamspace)

    await documentsPage.moreActionTeamspace(updateEditTeamspace.title, 'Edit teamspace')
    await documentsPage.checkTeamspace(updateEditTeamspace)
  })
})
