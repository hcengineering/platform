import { test, expect } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { PlanningPage } from '../model/planning/planning-page'
import { NewToDo } from '../model/planning/types'
import { PlanningNavigationMenuPage } from '../model/planning/planning-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})

const retryOptions = { intervals: [1000, 1500, 2500], timeout: 60000 }

test.describe('Planning ToDo tests', () => {
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

  test('Delete ToDo', async ({ page }) => {
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
})
