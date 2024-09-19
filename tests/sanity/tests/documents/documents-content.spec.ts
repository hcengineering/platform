import { test, type Page, expect } from '@playwright/test'
import {
  generateId,
  getTimeForPlanner,
  generateUser,
  createAccountAndWorkspace,
  createAccount,
  getInviteLink,
  generateTestData,
  getSecondPageByInvite
} from '../utils'
import { NewDocument, NewTeamspace } from '../model/documents/types'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentContentPage } from '../model/documents/document-content-page'
import { PlanningNavigationMenuPage } from '../model/planning/planning-navigation-menu-page'
import { PlanningPage } from '../model/planning/planning-page'
import { SignUpData } from '../model/common-types'
import { TestData } from '../chat/types'
import { faker } from '@faker-js/faker'

const retryOptions = { intervals: [1000, 1500, 2500], timeout: 60000 }

test.describe('Content in the Documents tests', () => {
  let testData: TestData
  let newUser2: SignUpData
  let testTeamspace: NewTeamspace
  let testDocument: NewDocument

  let leftSideMenuPage: LeftSideMenuPage
  let documentsPage: DocumentsPage
  let documentContentPage: DocumentContentPage

  let secondPage: Page
  let leftSideMenuSecondPage: LeftSideMenuPage
  let documentsSecondPage: DocumentsPage
  let documentContentSecondPage: DocumentContentPage

  test.beforeEach(async ({ browser, page, request }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    documentsPage = new DocumentsPage(page)
    documentContentPage = new DocumentContentPage(page)
    testTeamspace = {
      title: `Teamspace-${generateId()}`,
      description: 'Teamspace description',
      autoJoin: true
    }
    testDocument = {
      title: `Document-${generateId()}`,
      space: testTeamspace.title
    }

    testData = generateTestData()
    await createAccountAndWorkspace(page, request, testData)

    await leftSideMenuPage.clickDocuments()
    await documentsPage.checkTeamspaceNotExist(testTeamspace.title)
    await documentsPage.createNewTeamspace(testTeamspace)
    await documentsPage.clickOnButtonCreateDocument()
    await documentsPage.createDocument(testDocument)
    await documentsPage.openDocument(testDocument.title)
    await documentContentPage.checkDocumentTitle(testDocument.title)
  })

  test('ToDos in the Document', async ({ page, request, browser }) => {
    newUser2 = generateUser()
    await createAccount(request, newUser2)
    const linkText = await getInviteLink(page)
    using _secondPage = await getSecondPageByInvite(browser, linkText, newUser2)
    secondPage = _secondPage.page
    leftSideMenuSecondPage = new LeftSideMenuPage(secondPage)
    documentsSecondPage = new DocumentsPage(secondPage)
    documentContentSecondPage = new DocumentContentPage(secondPage)

    const contents: string[] = ['work', 'meet up']
    let content: string = ''

    for (let i = 0; i < contents.length; i++) {
      content = await documentContentPage.addContentToTheNewLine(`${i === 0 ? '[] ' : ''}${contents[i]}`)
      await documentContentPage.checkContent(content)
    }
    for (const line of contents) {
      await documentContentPage.assignToDo(`${newUser2.lastName} ${newUser2.firstName}`, line)
    }

    await leftSideMenuSecondPage.clickDocuments()
    await documentsSecondPage.openTeamspace(testDocument.space)
    await documentsSecondPage.openDocument(testDocument.title)
    await documentContentSecondPage.checkDocumentTitle(testDocument.title)
    await documentContentSecondPage.checkContent(content)
    await leftSideMenuSecondPage.clickPlanner()

    const planningNavigationMenuPage = new PlanningNavigationMenuPage(secondPage)
    await planningNavigationMenuPage.clickOnButtonToDoAll()
    const planningPage = new PlanningPage(secondPage)
    const time: string = getTimeForPlanner()
    await planningPage.dragToCalendar(contents[0], 1, time)
    await planningPage.dragToCalendar(contents[1], 1, time, true)
    await planningPage.checkInSchedule(contents[0])
    await planningPage.checkInSchedule(contents[1])
    await planningPage.markDoneInToDos(contents[0])
    await planningPage.markDoneInToDos(contents[1])

    for (const line of contents) await documentContentPage.checkToDo(line, true)
  })

  test('Table in the Document', async ({ page, browser, request }) => {
    newUser2 = generateUser()
    await createAccount(request, newUser2)
    const linkText = await getInviteLink(page)
    using _secondPage = await getSecondPageByInvite(browser, linkText, newUser2)
    secondPage = _secondPage.page
    leftSideMenuSecondPage = new LeftSideMenuPage(secondPage)
    documentsSecondPage = new DocumentsPage(secondPage)
    documentContentSecondPage = new DocumentContentPage(secondPage)

    await documentContentPage.inputContentParapraph().click()
    await documentContentPage.leftMenu().click()
    await documentContentPage.menuPopupItemButton('Table').click()
    await documentContentPage.menuPopupItemButton('1x2').first().click()
    await documentContentPage.proseTableCell(0, 0).fill('One')
    await documentContentPage.proseTableCell(0, 1).fill('Two')
    await documentContentPage.buttonInsertColumn().click()
    await documentContentPage.proseTableCell(0, 1).fill('Three')

    await documentContentPage.proseTableColumnHandle(1).hover()
    await expect(async () => {
      await page.mouse.down()
      const boundingBox = await documentContentPage.proseTableCell(0, 1).boundingBox()
      expect(boundingBox).toBeTruthy()
      if (boundingBox != null) {
        await page.mouse.move(boundingBox.x + boundingBox.width * 2, boundingBox.y - 5)
        await page.mouse.move(boundingBox.x + boundingBox.width * 2 + 5, boundingBox.y - 5)
        await page.mouse.up()
      }
    }).toPass(retryOptions)

    await documentContentPage.buttonInsertLastRow().click()
    await documentContentPage.proseTableCell(1, 1).fill('Bottom')
    await documentContentPage.buttonInsertInnerRow().click()
    await documentContentPage.proseTableCell(1, 1).fill('Middle')

    await leftSideMenuSecondPage.clickDocuments()
    await documentsSecondPage.openTeamspace(testDocument.space)
    await documentsSecondPage.openDocument(testDocument.title)
    await documentContentSecondPage.checkDocumentTitle(testDocument.title)
    await expect(documentContentSecondPage.proseTableCell(1, 1)).toContainText('Middle')
    await documentContentSecondPage.proseTableCell(1, 1).dblclick()
    await documentContentSecondPage.proseTableCell(1, 1).fill('Center')
    await expect(documentContentPage.proseTableCell(1, 1)).toContainText('Center', { timeout: 5000 })
  })

  test.describe('Image in the document', () => {
    test('Check image alignment setting', async ({ page }) => {
      await documentContentPage.addImageToDocument(page)

      await test.step('Align image to right', async () => {
        await documentContentPage.clickImageAlignButton('right')
        await documentContentPage.checkImageAlign('right')
      })

      await test.step('Align image to left', async () => {
        await documentContentPage.clickImageAlignButton('left')
        await documentContentPage.checkImageAlign('left')
      })

      await test.step('Align image to center', async () => {
        await documentContentPage.clickImageAlignButton('center')
        await documentContentPage.checkImageAlign('center')
      })
    })

    test('Check Image size manipulations', async ({ page }) => {
      await documentContentPage.addImageToDocument(page)

      await test.step('Set size of image to the 25%', async () => {
        await documentContentPage.clickImageSizeButton('25%')
        await documentContentPage.checkImageSize('25%')
      })

      await test.step('Set size of image to the 50%', async () => {
        await documentContentPage.clickImageSizeButton('50%')
        await documentContentPage.checkImageSize('50%')
      })

      await test.step('Set size of image to the 100%', async () => {
        await documentContentPage.clickImageSizeButton('100%')
        await documentContentPage.checkImageSize('100%')
      })

      await test.step('Set size of image to the unset', async () => {
        const IMAGE_ORIGINAL_SIZE = 199
        await documentContentPage.clickImageSizeButton('Unset')
        await documentContentPage.checkImageSize(IMAGE_ORIGINAL_SIZE)
      })
    })

    test('Check Image views', async ({ page, context }) => {
      await documentContentPage.addImageToDocument(page)
      const imageSrc = await documentContentPage.firstImageInDocument().getAttribute('src')

      await test.step('User can open image in fullscreen on current page', async () => {
        await documentContentPage.clickImageFullscreenButton()
        await expect(documentContentPage.fullscreenImage()).toBeVisible()
        await documentContentPage.page.keyboard.press('Escape')
        await expect(documentContentPage.fullscreenImage()).toBeHidden()
      })

      await test.step('User can open image original in the new tab', async () => {
        const pagePromise = context.waitForEvent('page')
        await documentContentPage.clickImageOriginalButton()
        const newPage = await pagePromise

        await newPage.waitForLoadState()
        expect(newPage.url()).toBe(imageSrc)
        await newPage.close()
      })
    })

    test('Remove image with Backspace', async ({ page }) => {
      await documentContentPage.addImageToDocument(page)
      await documentContentPage.selectedFirstImageInDocument()
      await documentContentPage.page.keyboard.press('Backspace')
      await expect(documentContentPage.firstImageInDocument()).toBeHidden()
    })

    test('Check Table of Content', async ({ page }) => {
      const HEADER_1_CONTENT = 'Header 1'
      const HEADER_2_CONTENT = 'Header 2'
      const HEADER_3_CONTENT = 'Header 3'
      const contentParts = [
        `# ${HEADER_1_CONTENT}\n\n${faker.lorem.paragraph(20)}\n`,
        `## ${HEADER_2_CONTENT}\n\n${faker.lorem.paragraph(20)}\n`,
        `### ${HEADER_3_CONTENT}\n\n${faker.lorem.paragraph(20)}`
      ]

      await test.step('Fill in the document and check the appearance of the ToC items', async () => {
        await documentContentPage.inputContentParapraph().click()

        let partIndex = 0
        for (const contentPart of contentParts) {
          await documentContentPage.page.keyboard.type(contentPart)
          await expect(documentContentPage.tocItems()).toHaveCount(++partIndex)
        }
      })

      await test.step('Check if ToC element is visible', async () => {
        await expect(documentContentPage.page.locator('.toc-container .toc-item')).toHaveCount(3)
      })

      await test.step('User go to first header by ToC', async () => {
        await documentContentPage.tocItems().first().click()
        await documentContentPage.buttonTocPopupHeader(HEADER_1_CONTENT).click()
        await expect(documentContentPage.headerElementInDocument('h1', HEADER_1_CONTENT)).toBeInViewport()
      })

      await test.step('User go to last header by ToC', async () => {
        await documentContentPage.tocItems().first().click()
        await documentContentPage.buttonTocPopupHeader(HEADER_3_CONTENT).click()
        await expect(documentContentPage.headerElementInDocument('h3', HEADER_3_CONTENT)).toBeInViewport()
      })
    })
  })

  test('Check a slash typing handling', async ({ page }) => {
    await test.step('User can open the popup if types "/" in empty document', async () => {
      await documentContentPage.inputContentParapraph().click()
      await documentContentPage.page.keyboard.type('/')
      await expect(documentContentPage.slashActionItemsPopup()).toBeVisible()
      await documentContentPage.page.keyboard.press('Escape')
    })

    await test.step('User can open the popup if types "/" after some content', async () => {
      await documentContentPage.inputContentParapraph().click()
      await documentContentPage.page.keyboard.type('First paragraph\n\n')
      await documentContentPage.page.keyboard.type('/')
      await expect(documentContentPage.slashActionItemsPopup()).toBeVisible()
      await documentContentPage.page.keyboard.press('Escape')
    })

    await test.step('User cannot open a popup if he types "/" inside code block', async () => {
      await documentContentPage.page.keyboard.press('Enter')
      await documentContentPage.page.keyboard.type('/')
      await documentContentPage.menuPopupItemButton('Code block').click()
      await documentContentPage.page.keyboard.type('/')
      await expect(documentContentPage.slashActionItemsPopup()).toBeHidden()
      await documentContentPage.page.keyboard.press('ArrowDown')
      await documentContentPage.page.keyboard.press('ArrowDown')
    })

    await test.step('User can create table by slash and open a popup if he types "/" inside a table', async () => {
      await documentContentPage.page.keyboard.type('/')
      await documentContentPage.menuPopupItemButton('Table').click()
      await documentContentPage.menuPopupItemButton('1x2').first().click()
      await documentContentPage.proseTableCell(0, 1).click()
      await documentContentPage.page.keyboard.type('/')
      await expect(documentContentPage.slashActionItemsPopup()).toBeVisible()
      await documentContentPage.page.keyboard.press('Escape')
    })
  })
})
