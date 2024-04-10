import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { DocumentsPage } from './model/documents/documents-page'
import { NewDocument } from './model/documents/types'

test.use({
  storageState: PlatformSetting
})

test.describe('documents tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('documents-new-document', async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    const documentTest: NewDocument = {
      title: 'document-' + generateId(),
      space: 'default'
    }
    // Creates test document
    await documentsPage.createDocument(documentTest)
    // Confirms new test document by opening it
    await documentsPage.openDocument(documentTest.title)
  })

  test('documents-delete-document', async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    const documentTest: NewDocument = {
      title: 'document-' + generateId(),
      space: 'default'
    }
    // Creates test document and opens it
    await documentsPage.createDocument(documentTest)
    await documentsPage.openDocument(documentTest.title)
    // Deletes test document
    await documentsPage.moreActionsOnDocument(documentTest.title, 'Delete')
    await page.locator('form[id="view:string:DeleteObject"] button.primary').click()
    await page.waitForTimeout(1000)
    // Confirms test document is not present in document list
    await expect(documentsPage).not.toContain(documentTest.title)
  })

  test('documents-enable-disable-star', async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    const documentTest: NewDocument = {
      title: 'document-' + generateId(),
      space: 'default'
    }
    // Creates test document and opens it
    await documentsPage.createDocument(documentTest)
    await documentsPage.openDocument(documentTest.title)
    // Confirms document is not starred
    await page.locator('use[href="/img/aFUUrxVo.svg#star"]').isVisible()
    await page.locator('use[href="/img/aFUUrxVo.svg#starred"]').isHidden()
    // Stars document
    await documentsPage.buttonStarDocument.click()
    // Confirms document is starred, and remains starred after a page refresh
    await page.locator('use[href="/img/aFUUrxVo.svg#starred"]').isVisible()
    await page.reload()
    await page.locator('use[href="/img/aFUUrxVo.svg#starred"]').isVisible()
    await page.locator('use[href="/img/aFUUrxVo.svg#star"]').isHidden()
    // Unstars document
    await documentsPage.buttonStarDocument.click()
    // Confirms document is unstarred, and remains unstarred after a page refresh
    await page.locator('use[href="/img/aFUUrxVo.svg#starred"]').isHidden()
    await page.reload()
    await page.locator('use[href="/img/aFUUrxVo.svg#starred"]').isHidden()
    await page.locator('use[href="/img/aFUUrxVo.svg#star"]').isVisible()
  })

  test('documents-add-snapshot', async ({ page }) => {
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonDocuments.click()

    const documentsPage = new DocumentsPage(page)
    await documentsPage.buttonCreateDocument.click()

    const documentTest: NewDocument = {
      title: 'document-' + generateId(),
      space: 'default'
    }
    // Creates test document and opens it
    await documentsPage.createDocument(documentTest)
    await documentsPage.openDocument(documentTest.title)
    // Opens document history and creates snapshot
    await documentsPage.buttonViewHistory.click()
    await documentsPage.buttonModalNewSnapshot.click()
    await documentsPage.createSnapshot('TestSnap')
    // Verifies snapshot was created
    await expect(page.getByText('TestSnap')).toBeVisible()
  })
})
