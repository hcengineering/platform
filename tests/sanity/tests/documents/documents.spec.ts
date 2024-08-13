import { test } from '@playwright/test'
import {
  generateId,
  getSecondPage,
  PlatformSetting,
  PlatformURI,
  getTimeForPlanner,
  generateUser,
  createAccountAndWorkspace,
  createAccount,
  getInviteLink,
  generateTestData,
  reLogin
} from '../utils'
import { NewDocument, NewTeamspace } from '../model/documents/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { PlanningNavigationMenuPage } from '../model/planning/planning-navigation-menu-page'
import { PlanningPage } from '../model/planning/planning-page'
import { SignUpData } from '../model/common-types'
import { SignInJoinPage } from '../model/signin-page'
import { TestData } from '../chat/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Documents tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let documentsPage: DocumentsPage
  let documentContentPage: DocumentContentPage

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    documentsPage = new DocumentsPage(page)
    documentContentPage = new DocumentContentPage(page)

    await page.goto(`${PlatformURI}/workbench/sanity-ws`)
  })

  test('Create a document', async () => {
    const newDocument: NewDocument = {
      title: `New Document-${generateId()}`,
      space: 'Default'
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(newDocument)
    await documentsPage.openDocument(newDocument.title)
    await documentContentPage.checkDocumentTitle(newDocument.title)
  })

  test('Edit document', async () => {
    const contentOne = ' * Text first line'
    const contentTwo = ' * Text second line'
    const newDocumentTitle = `Edit Updated Document Title-${generateId()}`
    const editDocument: NewDocument = {
      title: `Edit Document Title-${generateId()}`,
      space: 'Default'
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(editDocument)
    await documentsPage.openDocument(editDocument.title)
    await documentContentPage.checkDocumentTitle(editDocument.title)

    let content = await documentContentPage.addContentToTheNewLine(contentOne)
    await documentContentPage.checkContent(content)
    content = await documentContentPage.addContentToTheNewLine(contentTwo)
    await documentContentPage.checkContent(content)
    await documentContentPage.updateDocumentTitle(newDocumentTitle)
    await documentContentPage.checkDocumentTitle(newDocumentTitle)
  })

  test('Move document', async () => {
    const contentFirst = 'Text first line'
    const moveDocument: NewDocument = {
      title: `Move Document Title-${generateId()}`,
      space: 'Default'
    }
    const moveTeamspace: NewTeamspace = {
      title: `Move Teamspace-${generateId()}`,
      description: 'Move Teamspace description',
      private: false
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(moveTeamspace.title)
    await documentsPage.createNewTeamspace(moveTeamspace)
    await documentsPage.checkTeamspaceExist(moveTeamspace.title)
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(moveDocument)
    await documentsPage.openDocument(moveDocument.title)
    await documentContentPage.checkDocumentTitle(moveDocument.title)
    const content = await documentContentPage.addContentToTheNewLine(contentFirst)
    await documentContentPage.checkContent(content)
    await documentsPage.moreActionsOnDocument(moveDocument.title, 'Move')
    await documentsPage.fillMoveDocumentForm(moveTeamspace.title)
    await documentsPage.openTeamspace(moveTeamspace.title)
    await documentsPage.openDocumentForTeamspace(moveTeamspace.title, moveDocument.title)
    await documentContentPage.checkDocumentTitle(moveDocument.title)
  })

  test('Collaborative edit document content', async ({ page, browser }) => {
    let content = ''
    const contentFirstUser = 'First first!!! This string comes from the first user'
    const contentSecondUser = 'Second second!!! This string comes from the second user'
    const colDocument: NewDocument = {
      title: `Collaborative edit Title-${generateId()}`,
      space: 'Default'
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.openTeamspace(colDocument.space)
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(colDocument)
    await documentsPage.openDocument(colDocument.title)
    await test.step('User1. Add content first user', async () => {
      await documentContentPage.checkDocumentTitle(colDocument.title)
      content = await documentContentPage.addContentToTheNewLine(contentFirstUser)
      await documentContentPage.checkContent(content)
    })

    await test.step('User2. Add content second user', async () => {
      const { page: userSecondPage, context } = await getSecondPage(browser)

      await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws`)
      const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
      await leftSideMenuPageSecond.clickDocuments()
      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openTeamspace(colDocument.space)
      await documentsPageSecond.openDocument(colDocument.title)
      const documentContentPageSecond = new DocumentContentPage(userSecondPage)
      await documentContentPageSecond.checkDocumentTitle(colDocument.title)
      await documentContentPageSecond.checkContent(content)
      content = await documentContentPageSecond.addContentToTheNewLine(contentSecondUser)
      await documentContentPageSecond.checkContent(content)

      await userSecondPage.close()
      await context.close()
    })

    await test.step('User1. Check final content', async () => {
      await documentContentPage.checkDocumentTitle(colDocument.title)
      await documentContentPage.checkContent(content)
    })
  })

  test('Add Link to the Document', async () => {
    const contentLink = 'Lineforthelink'
    const linkDocument: NewDocument = {
      title: `Links Document Title-${generateId()}`,
      space: 'Default'
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(linkDocument)
    await documentsPage.openDocument(linkDocument.title)
    await documentContentPage.checkDocumentTitle(linkDocument.title)
    await documentContentPage.addRandomLines(5)
    await documentContentPage.addContentToTheNewLine(contentLink)
    await documentContentPage.addRandomLines(5)
    await documentContentPage.addLinkToText(contentLink, 'test/link/123456')
    await documentContentPage.checkLinkInTheText(contentLink, 'test/link/123456')
  })

  test('Locked document and checking URL', async ({ page, context }) => {
    const newDocument: NewDocument = {
      title: `New Document-${generateId()}`,
      space: 'Default'
    }

    await leftSideMenuPage.clickDocuments()
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(newDocument)
    await documentsPage.selectMoreActionOfDocument(newDocument.title, 'Lock')
    await documentsPage.selectMoreActionOfDocument(newDocument.title, 'Copy document URL to clipboard')
    await context.grantPermissions(['clipboard-read'])
    const handle = await page.evaluateHandle(() => navigator.clipboard.readText())
    const clipboardContent = await handle.jsonValue()
    await page.goto(`${clipboardContent}`)
    await documentContentPage.checkDocumentTitle(newDocument.title)
    await documentContentPage.checkDocumentLocked()
  })

  test('ToDos in the Document', async ({ page, browser, request }) => {
    const testData: TestData = generateTestData()
    await createAccountAndWorkspace(page, request, testData)
    const newUser2: SignUpData = generateUser()
    await createAccount(request, newUser2)

    const todosTeamspace: NewTeamspace = {
      title: `ToDos Teamspace-${generateId()}`,
      description: 'ToDos Teamspace description',
      autoJoin: true
    }
    const todosDocument: NewDocument = {
      title: `ToDos in the Document-${generateId()}`,
      space: todosTeamspace.title
    }
    const contents: string[] = ['work', 'meet up']
    let content: string = ''

    const linkText = await getInviteLink(page)
    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(todosTeamspace.title)
    await documentsPage.createNewTeamspace(todosTeamspace)
    const page2 = await browser.newPage()
    await page2.goto(linkText ?? '')
    const joinPage: SignInJoinPage = new SignInJoinPage(page2)
    await joinPage.join(newUser2)
    await page2.goto(`${PlatformURI}/workbench/sanity-ws`)

    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(todosDocument)
    await documentsPage.openDocument(todosDocument.title)
    await documentContentPage.checkDocumentTitle(todosDocument.title)
    for (let i = 0; i < contents.length; i++) {
      content = await documentContentPage.addContentToTheNewLine(`${i === 0 ? '[] ' : ''}${contents[i]}`)
      await documentContentPage.checkContent(content)
    }
    for (const line of contents) {
      await documentContentPage.assignToDo(`${newUser2.lastName} ${newUser2.firstName}`, line)
    }

    await reLogin(page2, { ...testData, userName: newUser2.email })
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)
    await leftSideMenuPageSecond.clickDocuments()
    const documentsPageSecond = new DocumentsPage(page2)
    await documentsPageSecond.openTeamspace(todosDocument.space)
    await documentsPageSecond.openDocument(todosDocument.title)
    const documentContentPageSecond = new DocumentContentPage(page2)
    await documentContentPageSecond.checkDocumentTitle(todosDocument.title)
    await documentContentPageSecond.checkContent(content)
    await leftSideMenuPageSecond.clickPlanner()

    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page2)
    await planningNavigationMenuPage.clickOnButtonToDoAll()
    const planningPage = new PlanningPage(page2)
    const time: string = getTimeForPlanner()
    await planningPage.dragToCalendar(contents[0], 1, time)
    await planningPage.dragToCalendar(contents[1], 1, time, true)
    await planningPage.checkInSchedule(contents[0])
    await planningPage.checkInSchedule(contents[1])
    await planningPage.markDoneInToDos(contents[0])
    await planningPage.markDoneInToDos(contents[1])
    for (const line of contents) await documentContentPage.checkToDo(line, true)
    await page2.close()
  })
})
