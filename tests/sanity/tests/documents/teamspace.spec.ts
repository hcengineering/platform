import { test } from '@playwright/test'
import { TestData } from '../chat/types'
import { SignUpData } from '../model/common-types'
import { DocumentsPage } from '../model/documents/documents-page'
import { NewTeamspace } from '../model/documents/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { SignInJoinPage } from '../model/signin-page'
import {
  createAccount,
  createAccountAndWorkspace,
  generateId,
  generateTestData,
  generateUser,
  getInviteLink,
  PlatformSetting,
  PlatformURI,
  setTestOptions
} from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Teamspace tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let documentsPage: DocumentsPage

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    documentsPage = new DocumentsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a teamspace', async ({ page }) => {
    const newTeamspace: NewTeamspace = {
      title: `New Teamspace-${generateId()}`,
      description: 'New Teamspace description',
      private: false
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(newTeamspace.title)
    await documentsPage.createNewTeamspace(newTeamspace)
    await documentsPage.checkTeamspaceExist(newTeamspace.title)
  })

  test('Archive teamspace', async ({ page }) => {
    const archiveTeamspace: NewTeamspace = {
      title: 'Teamspace for archive'
    }

    await leftSideMenuPage.clickDocuments()
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

    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(editTeamspace.title)
    await documentsPage.createNewTeamspace(editTeamspace)
    await documentsPage.checkTeamspaceExist(editTeamspace.title)
    await documentsPage.moreActionTeamspace(editTeamspace.title, 'Edit teamspace')
    await documentsPage.editTeamspace(updateEditTeamspace)
    await documentsPage.moreActionTeamspace(updateEditTeamspace.title, 'Edit teamspace')
    await documentsPage.checkTeamspace(updateEditTeamspace)
  })

  test('Auto-join teamspace', async ({ page, request, browser }) => {
    const testData: TestData = generateTestData()
    await createAccountAndWorkspace(page, request, testData)
    const newUser2: SignUpData = generateUser()
    await createAccount(request, newUser2)

    const autojoinTeamspace: NewTeamspace = {
      title: `Auto-join Teamspace-${generateId()}`,
      description: 'Auto-join Teamspace description',
      private: false,
      autoJoin: true
    }
    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(autojoinTeamspace.title)
    await documentsPage.createNewTeamspace(autojoinTeamspace)
    const linkText = await getInviteLink(page)

    const page2 = await browser.newPage()
    try {
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
      const joinPage: SignInJoinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)
      const documentsSecondPage: DocumentsPage = new DocumentsPage(page2)
      await documentsSecondPage.clickDocumentsApp()
      await documentsSecondPage.checkTeamspaceExist(autojoinTeamspace.title)
    } finally {
      await page2.close()
    }
  })

  test('Join teamspace', async ({ page, request, browser }) => {
    const testData: TestData = generateTestData()
    await createAccountAndWorkspace(page, request, testData)
    const newUser2: SignUpData = generateUser()
    await createAccount(request, newUser2)

    const joinTeamspace: NewTeamspace = {
      title: `Join Teamspace-${generateId()}`,
      description: 'Join Teamspace description'
    }
    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(joinTeamspace.title)
    await documentsPage.createNewTeamspace(joinTeamspace)
    const linkText = await getInviteLink(page)

    const page2 = await browser.newPage()
    try {
      await page2.goto(linkText ?? '')
      await setTestOptions(page2)
      const joinPage: SignInJoinPage = new SignInJoinPage(page2)
      await joinPage.join(newUser2)
      const documentsSecondPage: DocumentsPage = new DocumentsPage(page2)
      await documentsSecondPage.clickDocumentsApp()
      await documentsSecondPage.checkTeamspaceNotExist(joinTeamspace.title)
      await documentsSecondPage.clickTeamspaces()
      await documentsSecondPage.joinTeamspace(joinTeamspace.title)
      await documentsSecondPage.checkTeamspaceExist(joinTeamspace.title)
    } finally {
      await page2.close()
    }
  })
})
