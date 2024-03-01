import { test } from '@playwright/test'
import { generateId, getSecondPage, PlatformSetting, PlatformURI } from '../utils'
import { NewDocument, NewTeamspace } from '../model/documents/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentContentPage } from '../model/documents/document-content-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Documents tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('Create a document', async ({ page }) => {
    const newDocument: NewDocument = {
      title: `New Document-${generateId()}`,
      space: 'Default'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    await documentsPage.createDocument(newDocument)
    await documentsPage.openDocument(newDocument.title)

    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.checkDocumentTitle(newDocument.title)
  })

  test('Edit document', async ({ page }) => {
    const contentOne = ' * Text first line'
    const contentTwo = ' * Text second line'
    const newDocumentTitle = `Edit Updated Document Title-${generateId()}`
    const editDocument: NewDocument = {
      title: `Edit Document Title-${generateId()}`,
      space: 'Default'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    await documentsPage.createDocument(editDocument)
    await documentsPage.openDocument(editDocument.title)

    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.checkDocumentTitle(editDocument.title)

    let content = await documentContentPage.addContentToTheNewLine(contentOne)
    await documentContentPage.checkContent(content)

    content = await documentContentPage.addContentToTheNewLine(contentTwo)
    await documentContentPage.checkContent(content)

    await documentContentPage.updateDocumentTitle(newDocumentTitle)
    await documentContentPage.checkDocumentTitle(newDocumentTitle)
  })

  test('Move document', async ({ page }) => {
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

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.checkTeamspaceNotExist(moveTeamspace.title)
    await documentsPage.createNewTeamspace(moveTeamspace)
    await documentsPage.checkTeamspaceExist(moveTeamspace.title)
    await documentsPage.buttonCreateDocument.click()

    await documentsPage.createDocument(moveDocument)
    await documentsPage.openDocument(moveDocument.title)

    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.checkDocumentTitle(moveDocument.title)

    const content = await documentContentPage.addContentToTheNewLine(contentFirst)
    await documentContentPage.checkContent(content)

    await documentsPage.moreActionsOnDocument(moveDocument.title, 'Move')
    await documentsPage.fillMoveDocumentForm(moveTeamspace.title)

    await documentsPage.openTeamspace(moveTeamspace.title)
    await documentsPage.openDocumentForTeamspace(moveTeamspace.title, moveDocument.title)
    await documentContentPage.checkDocumentTitle(moveDocument.title)
  })

  test('Collarabotive edit document content', async ({ page, browser }) => {
    let content = ''
    const contentFirstUser = 'First first!!! This string come from from the first user'
    const contentSecondUser = 'Second second!!! This string come from from the second user'
    const colDocument: NewDocument = {
      title: `Collarabotive edit Title-${generateId()}`,
      space: 'Default'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.openTeamspace(colDocument.space)
    await documentsPage.buttonCreateDocument.click()

    await documentsPage.createDocument(colDocument)
    await documentsPage.openDocument(colDocument.title)

    await test.step('User1. Add content first user', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(colDocument.title)

      content = await documentContentPage.addContentToTheNewLine(contentFirstUser)
      await documentContentPage.checkContent(content)
    })

    await test.step('User2. Add content second user', async () => {
      const userSecondPage = await getSecondPage(browser)
      await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()

      const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
      await leftSideMenuPageSecond.buttonDocuments.click()

      const documentsPageSecond = new DocumentsPage(userSecondPage)
      await documentsPageSecond.openTeamspace(colDocument.space)
      await documentsPageSecond.openDocument(colDocument.title)

      const documentContentPageSecond = new DocumentContentPage(page)
      await documentContentPageSecond.checkDocumentTitle(colDocument.title)
      await documentContentPageSecond.checkContent(content)

      content = await documentContentPageSecond.addContentToTheNewLine(contentSecondUser)
      await documentContentPageSecond.checkContent(content)
    })

    await test.step('User1. Check final content', async () => {
      const documentContentPage = new DocumentContentPage(page)
      await documentContentPage.checkDocumentTitle(colDocument.title)
      await documentContentPage.checkContent(content)
    })
  })

  test('Add Link to the Document', async ({ page }) => {
    const contentLink = 'Lineforthelink'
    const linkDocument: NewDocument = {
      title: `Links Document Title-${generateId()}`,
      space: 'Default'
    }

    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    await documentsPage.createDocument(linkDocument)
    await documentsPage.openDocument(linkDocument.title)

    const documentContentPage = new DocumentContentPage(page)
    await documentContentPage.checkDocumentTitle(linkDocument.title)

    await documentContentPage.addRandomLines(5)
    await documentContentPage.addContentToTheNewLine(contentLink)
    await documentContentPage.addRandomLines(5)

    await documentContentPage.addLinkToText(contentLink, 'test/link/123456')
    await documentContentPage.checkLinkInTheText(contentLink, 'test/link/123456')
  })
})
