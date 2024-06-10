import { test } from '@playwright/test'
import { NewDocument } from './model/documents/types'
import { LeftSideMenuPage } from './model/left-side-menu-page'
import { DocumentsPage } from './model/documents/documents-page'
import { DocumentContentPage } from './model/documents/document-content-page'
import { IssuesPage } from './model/tracker/issues-page'
import { IssuesDetailsPage } from './model/tracker/issues-details-page'
import { SpotlightPopup } from './model/spotlight-popup'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { NewIssue } from './model/tracker/types'
import { SignUpData } from './model/common-types'
import { LoginPage } from './model/login-page'
import { SignUpPage } from './model/signup-page'
import { SelectWorkspacePage } from './model/select-workspace-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Fulltext index', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test.describe('Documents', () => {
    let leftSideMenuPage: LeftSideMenuPage
    let documentsPage: DocumentsPage
    let documentContentPage: DocumentContentPage
    let spotlight: SpotlightPopup

    test.beforeEach(async ({ page }) => {
      leftSideMenuPage = new LeftSideMenuPage(page)
      documentsPage = new DocumentsPage(page)
      documentContentPage = new DocumentContentPage(page)
      spotlight = new SpotlightPopup(page)

      await leftSideMenuPage.clickDocuments()
    })

    test('Search created document', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const newDocument: NewDocument = {
        title: `Indexable Document ${titleId}`,
        space: 'Default'
      }

      const content = `Indexable document content ${contentId}`

      await test.step('create document', async () => {
        await documentsPage.clickOnButtonCreateDocument()
        await documentsPage.createDocument(newDocument)
        await documentsPage.openDocument(newDocument.title)
        await documentContentPage.checkDocumentTitle(newDocument.title)
        await documentContentPage.addContentToTheNewLine(content)
        await documentContentPage.checkContent(content)
      })

      await test.step('close document', async () => {
        // Go to inbox to close the document and trigger indexation
        await leftSideMenuPage.clickNotification()
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newDocument.title, 1)
        await spotlight.close()
      })

      await test.step('search by content', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(contentId)
        await spotlight.checkSearchResult(newDocument.title, 1)
        await spotlight.close()
      })
    })

    test('Search updated document', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const newDocument: NewDocument = {
        title: `Indexable Document ${titleId}`,
        space: 'Default'
      }

      const content = `Indexable document content ${contentId}`

      const updatedTitleId = generateId()
      const updatedTitle = `Indexable Document ${updatedTitleId}`

      const updatedContentId = generateId()
      const updatedContent = `Indexable document content ${updatedContentId}`
      await test.step('create document', async () => {
        await documentsPage.clickOnButtonCreateDocument()
        await documentsPage.createDocument(newDocument)
        await documentsPage.openDocument(newDocument.title)
        await documentContentPage.checkDocumentTitle(newDocument.title)
        await documentContentPage.addContentToTheNewLine(content)
        await documentContentPage.checkContent(content)
      })

      await test.step('update document', async () => {
        await documentContentPage.updateDocumentTitle(updatedTitle)
        await documentContentPage.checkDocumentTitle(updatedTitle)
        await documentContentPage.addContentToTheNewLine(updatedContent)
      })

      await test.step('close document', async () => {
        // Go to inbox to close the document and trigger indexation
        await leftSideMenuPage.clickNotification()
      })

      await test.step('search by old title', async () => {
        await spotlight.open()
        await spotlight.checkSearchResult(newDocument.title, 0)
        await spotlight.checkSearchResult(updatedTitle, 0)
        await spotlight.close()
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(updatedTitleId)
        await spotlight.checkSearchResult(updatedTitle, 1)
        await spotlight.close()
      })

      await test.step('search by content', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(updatedContentId)
        await spotlight.checkSearchResult(updatedTitle, 1)
        await spotlight.close()
      })
    })

    test('Search removed document', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const newDocument: NewDocument = {
        title: `Indexable Document ${titleId}`,
        space: 'Default'
      }
      const content = `Indexable document content ${contentId}`
      await test.step('create document', async () => {
        await documentsPage.clickOnButtonCreateDocument()

        await documentsPage.createDocument(newDocument)
        await documentsPage.openDocument(newDocument.title)

        await documentContentPage.checkDocumentTitle(newDocument.title)

        await documentContentPage.addContentToTheNewLine(content)
        await documentContentPage.checkContent(content)
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newDocument.title, 1)
        await spotlight.close()
      })

      await test.step('remove document', async () => {
        await documentContentPage.executeMoreAction('Delete')
        await documentContentPage.pressYesForPopup(page)
        // Go to inbox to close the document and trigger indexation
        await leftSideMenuPage.clickNotification()
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newDocument.title, 0)
        await spotlight.close()
      })
    })
  })

  test.describe('Issues', () => {
    let leftSideMenuPage: LeftSideMenuPage
    let issuesPage: IssuesPage
    let spotlight: SpotlightPopup
    let issuesDetailsPage: IssuesDetailsPage

    test.beforeEach(async ({ page }) => {
      leftSideMenuPage = new LeftSideMenuPage(page)
      issuesPage = new IssuesPage(page)
      spotlight = new SpotlightPopup(page)
      issuesDetailsPage = new IssuesDetailsPage(page)
      await leftSideMenuPage.clickTracker()
    })

    test('Search created issue', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const newIssue: NewIssue = {
        title: `Indexable issue ${titleId}`,
        description: `Indexable issue content ${contentId}`,
        status: 'Backlog'
      }

      await test.step('create issue', async () => {
        await issuesPage.createNewIssue(newIssue)
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 1)
        await spotlight.close()
      })

      await test.step('search by content', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(contentId)
        await spotlight.checkSearchResult(newIssue.title, 1)
        await spotlight.close()
      })
    })

    test('Search updated issue', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const updatedTitleId = generateId()
      const updatedContentId = generateId()
      const updatedTitle = `Indexable issue ${updatedTitleId}`
      const updatedContent = `Indexable issue ${updatedContentId}`

      const newIssue: NewIssue = {
        title: `Indexable issue ${titleId}`,
        description: `Indexable issue content ${contentId}`,
        status: 'Backlog'
      }

      await test.step('create issue', async () => {
        await issuesPage.createNewIssue(newIssue)
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 1)
        await spotlight.close()
      })

      await test.step('update issue', async () => {
        await issuesPage.linkSidebarAll().click()
        await issuesPage.clickModelSelectorAll()
        await issuesPage.searchIssueByName(newIssue.title)
        await issuesPage.openIssueByName(newIssue.title)
        await issuesDetailsPage.editIssue({ title: updatedTitle })
        await issuesDetailsPage.addToDescription(updatedContent)
        await issuesDetailsPage.clickCloseIssueButton()
      })

      await test.step('search by old title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 0)
        await spotlight.close()
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(updatedTitleId)
        await spotlight.checkSearchResult(updatedTitle, 1)
        await spotlight.close()
      })

      await test.step('search by content', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(updatedContentId)
        await spotlight.checkSearchResult(updatedTitle, 1)
        await spotlight.close()
      })
    })

    test('Search removed issue', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const newIssue: NewIssue = {
        title: `Indexable issue ${titleId}`,
        description: `Indexable issue content ${contentId}`,
        status: 'Backlog'
      }

      await test.step('create issue', async () => {
        await issuesPage.createNewIssue(newIssue)
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 1)
        await spotlight.close()
      })

      await test.step('remove issue', async () => {
        await issuesPage.linkSidebarAll().click()
        await issuesPage.clickModelSelectorAll()
        await issuesPage.searchIssueByName(newIssue.title)
        await issuesPage.openIssueByName(newIssue.title)
        await issuesDetailsPage.moreActionOnIssue('Delete')
        await issuesDetailsPage.pressYesForPopup(page)
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 0)
        await spotlight.close()
      })
    })
  })

  test.describe('Indexed data does not leak cross workspace', () => {
    test('Search issue from another workspace', async ({ page }) => {
      const titleId = generateId()
      const contentId = generateId()

      const newIssue: NewIssue = {
        title: `Indexable issue ${titleId}`,
        description: `Indexable issue content ${contentId}`,
        status: 'Backlog'
      }

      const loginPage = new LoginPage(page)
      const signUpPage = new SignUpPage(page)
      const selectWorkspacePage = new SelectWorkspacePage(page)
      const leftSideMenuPage = new LeftSideMenuPage(page)
      const issuesPage = new IssuesPage(page)
      const spotlight = new SpotlightPopup(page)

      await test.step('create issue', async () => {
        await leftSideMenuPage.clickTracker()
        await issuesPage.createNewIssue(newIssue)
      })

      await test.step('search by title', async () => {
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 1)
        await spotlight.close()
      })

      await test.step('create workspace', async () => {
        const newUser: SignUpData = {
          firstName: `FirstName-${generateId()}`,
          lastName: `LastName-${generateId()}`,
          email: `email+${generateId()}@gmail.com`,
          password: '1234'
        }
        const newWorkspaceName = `New Workspace Name - ${generateId(2)}`

        await loginPage.goto()
        await loginPage.clickSignUp()
        await signUpPage.signUp(newUser)

        await selectWorkspacePage.createWorkspace(newWorkspaceName)
      })

      await test.step('search by title', async () => {
        await leftSideMenuPage.clickTracker()
        await spotlight.open()
        await spotlight.fillSearchInput(titleId)
        await spotlight.checkSearchResult(newIssue.title, 0)
        await spotlight.close()
      })
    })
  })
})
