import { test, expect } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { PlanningPage } from '../model/planning/planning-page'
import { NewToDo } from '../model/planning/types'
import { PlanningNavigationMenuPage } from '../model/planning/planning-navigation-menu-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { DocumentsPage } from '../model/documents/documents-page'
import { DocumentContentPage } from '../model/documents/document-content-page'

test.use({
  storageState: PlatformSetting
})

const retryOptions = { intervals: [1000, 1500, 2500], timeout: 60000 }

test.describe('Planning ToDo tests', () => {
  let issuesPage: IssuesPage
  let issuesDetailsPage: IssuesDetailsPage
  let leftSideMenuPage: LeftSideMenuPage
  let documentsPage: DocumentsPage
  let documentContentPage: DocumentContentPage

  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/time`))?.finished()
  })

  test('New ToDo and checking notifications about unplanned tasks', async ({ page }) => {
    const dateEnd = new Date()
    dateEnd.setDate(dateEnd.getDate() + 1)

    const newToDo: NewToDo = {
      title: `ToDo with all parameters-${generateId()}`,
      description: 'Created todo with all parameters and attachments description',
      duedate: 'today',
      priority: 'High',
      visible: 'Visible to everyone',
      createLabel: true,
      labels: `CREATE-TODO-${generateId()}`,
      slots: [
        {
          dateStart: 'today',
          timeStart: '1130',
          dateEnd: {
            day: dateEnd.getDate().toString(),
            month: (dateEnd.getMonth() + 1).toString(),
            year: dateEnd.getFullYear().toString()
          },
          timeEnd: '1830'
        }
      ]
    }

    const planningPage = new PlanningPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.clickOnButtonUnplanned()
    await expect(async () => {
      await planningNavigationMenuPage.compareCountersUnplannedToDos()
    }).toPass(retryOptions)
    await planningPage.createNewToDo(newToDo)
    await expect(async () => {
      await planningNavigationMenuPage.compareCountersUnplannedToDos()
    }).toPass(retryOptions)
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    await planningPage.checkToDoExist(newToDo.title)
    await planningPage.openToDoByName(newToDo.title)
  })

  test('Edit a ToDo', async ({ page }) => {
    const dateEnd = new Date()
    const editToDo: NewToDo = {
      title: 'ToDo For Edit',
      description: 'For Edit todo',
      duedate: 'today',
      priority: 'Medium',
      visible: 'FreeBusy',
      createLabel: true,
      labels: `EDIT-TODO-${generateId()}`,
      slots: [
        {
          dateStart: 'today',
          timeStart: '1530',
          dateEnd: {
            day: dateEnd.getDate().toString(),
            month: (dateEnd.getMonth() + 1).toString(),
            year: dateEnd.getFullYear().toString()
          },
          timeEnd: '1830'
        }
      ]
    }

    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    const planningPage = new PlanningPage(page)
    await planningPage.openToDoByName(editToDo.title)
    await planningPage.updateToDo(editToDo)
    await planningPage.clickButtonCardClose()

    await planningPage.openToDoByName(editToDo.title)
    await planningPage.checkToDo({
      ...editToDo,
      priority: 'medium',
      duedate: `${dateEnd.getMonth() + 1}/${dateEnd.getDate()}/${dateEnd.getFullYear()}`,
      slots: [
        {
          dateStart: '',
          timeStart: '15 : 30',
          dateEnd: {
            day: dateEnd.getDate().toString(),
            month: (dateEnd.getMonth() + 1).toString(),
            year: dateEnd.getFullYear().toString()
          },
          timeEnd: '18 : 30'
        }
      ]
    })
  })

  test('', async ({ page }) => {
    const deleteToDo: NewToDo = {
      title: 'ToDo For delete'
    }

    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    const planningPage = new PlanningPage(page)
    await planningPage.deleteToDoByName(deleteToDo.title)
    await planningPage.checkToDoNotExist(deleteToDo.title)
  })

  test.skip('Unplanned / Planned ToDo', async ({ page }) => {
    const newToDoPlanned: NewToDo = {
      title: 'ToDo Planned'
    }
    const newToDoUnPlanned: NewToDo = {
      title: 'ToDo UnPlanned'
    }

    const planningPage = new PlanningPage(page)

    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.clickOnButtonToDoAll()
    await planningPage.checkToDoExist(newToDoPlanned.title)
    await planningPage.checkToDoExist(newToDoUnPlanned.title)

    await planningNavigationMenuPage.clickOnButtonUnplanned()
    await planningPage.selectToDoByName(newToDoPlanned.title)

    await planningPage.checkToDoNotExist(newToDoPlanned.title)
    await planningPage.checkToDoExist(newToDoUnPlanned.title)

    await planningNavigationMenuPage.clickOnButtonToDoPlanned()
    await planningPage.checkToDoNotExist(newToDoUnPlanned.title)
    await planningPage.checkToDoExist(newToDoPlanned.title)

    await planningNavigationMenuPage.clickOnButtonToDoAll()
    await planningPage.checkToDoExist(newToDoPlanned.title)
    await planningPage.checkToDoExist(newToDoUnPlanned.title)
  })

  test('Show ActionItem in Planner from Issue description', async ({ page }) => {
    issuesPage = new IssuesPage(page)
    issuesDetailsPage = new IssuesDetailsPage(page)
    leftSideMenuPage = new LeftSideMenuPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    const planningPage = new PlanningPage(page)
    const toDoName = `ToDo from issue ${generateId()}`

    const newIssue = {
      title: `Issue with ToDos ${generateId()}`,
      description: '',
      projectName: 'Default'
    }

    await test.step('Prepare Issue and add ActionItems to that', async () => {
      await leftSideMenuPage.clickTracker()
      await issuesPage.clickNewIssue()
      await issuesPage.fillNewIssueForm(newIssue)
      await issuesPage.clickButtonCreateIssue()
      await issuesPage.clickLinkSidebarAll()
      await issuesPage.openIssueByName(newIssue.title)
      await issuesDetailsPage.editIssue({ assignee: 'Appleseed John', status: 'ToDo' })

      await issuesDetailsPage.addToDescription('/')
      await issuesPage.page.locator('.selectPopup button:has-text("Action item")').click()
      await issuesPage.page.keyboard.type(toDoName)
      await issuesPage.page.keyboard.press('Escape')
      await issuesDetailsPage.assignToDo('Appleseed John', toDoName)
    })

    await test.step('Check ToDo in Planner', async () => {
      await leftSideMenuPage.clickPlanner()
      await planningNavigationMenuPage.clickOnButtonToDoAll()
      await planningPage.checkToDoExist(toDoName)
    })
  })

  test('Show ActionItem in Planner from Document', async ({ page }) => {
    documentsPage = new DocumentsPage(page)
    documentContentPage = new DocumentContentPage(page)
    leftSideMenuPage = new LeftSideMenuPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    const planningPage = new PlanningPage(page)
    const toDoName = `ToDo from document ${generateId()}`

    const newDocument = {
      title: `Document with ToDos ${generateId()}`,
      space: 'Default'
    }

    await test.step('Prepare Document and add ActionItems to that', async () => {
      await leftSideMenuPage.clickDocuments()
      await documentsPage.buttonCreateDocument().click()
      await documentsPage.createDocument(newDocument)
      await documentsPage.openDocument(newDocument.title)
      await documentContentPage.addContentToTheNewLine('/')

      await documentContentPage.page.locator('.selectPopup button:has-text("Action item")').click()
      await documentContentPage.page.keyboard.type(toDoName)
      await documentContentPage.page.keyboard.press('Escape')
      await documentContentPage.assignToDo('Appleseed John', toDoName)
    })

    await test.step('Check ToDo in Planner', async () => {
      await leftSideMenuPage.clickPlanner()
      await planningNavigationMenuPage.clickOnButtonToDoAll()
      await planningPage.checkToDoExist(toDoName)
    })
  })
})
