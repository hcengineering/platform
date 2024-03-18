import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'
import { PlanningPage } from '../model/planning/planning-page'
import { NewToDo } from '../model/planning/types'
import { PlanningNavigationMenuPage } from '../model/planning/planning-navigation-menu-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Planning ToDo tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/time`))?.finished()
  })

  test('Add several slots for the same day', async ({ browser, page }) => {
    const dateEnd = new Date()
    const toDoSeveralSlots: NewToDo = {
      title: 'Add several slots for the same day',
      slots: [
        {
          dateStart: 'today',
          timeStart: '1000',
          dateEnd: {
            day: dateEnd.getDate().toString(),
            month: (dateEnd.getMonth() + 1).toString(),
            year: dateEnd.getFullYear().toString()
          },
          timeEnd: '1400'
        },
        {
          dateStart: 'today',
          timeStart: '1500',
          dateEnd: {
            day: dateEnd.getDate().toString(),
            month: (dateEnd.getMonth() + 1).toString(),
            year: dateEnd.getFullYear().toString()
          },
          timeEnd: '1800'
        }
      ]
    }

    const planningPage = new PlanningPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.buttonToDoAll.click()

    await planningPage.checkToDoExist(toDoSeveralSlots.title)
    await planningPage.openToDoByName(toDoSeveralSlots.title)

    if (toDoSeveralSlots.slots != null) {
      await planningPage.buttonPanelCreateAddSlot.click({ force: true })
      await planningPage.setTimeSlot(0, toDoSeveralSlots.slots[0])
      await planningPage.buttonPanelCreateAddSlot.click({ force: true })
      await planningPage.setTimeSlot(1, toDoSeveralSlots.slots[1])
    }
    await planningPage.buttonCardClose.click()

    await planningPage.checkToDoExistInCalendar(toDoSeveralSlots.title, 2)
  })

  test('Delete and add a new time slot', async ({ page }) => {
    const dateEnd = new Date()
    const deleteTimeSlot: NewToDo = {
      title: 'Delete and add a new time slot',
      slots: [
        {
          dateStart: 'today',
          timeStart: '0900',
          dateEnd: {
            day: dateEnd.getDate().toString(),
            month: (dateEnd.getMonth() + 1).toString(),
            year: dateEnd.getFullYear().toString()
          },
          timeEnd: '1800'
        }
      ]
    }
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.buttonToDoAll.click()

    const planningPage = new PlanningPage(page)
    await planningPage.checkToDoExist(deleteTimeSlot.title)
    await planningPage.openToDoByName(deleteTimeSlot.title)

    if (deleteTimeSlot.slots != null) {
      await planningPage.buttonPanelCreateAddSlot.click({ force: true })
      await planningPage.setTimeSlot(0, deleteTimeSlot.slots[0])
    }
    await planningPage.buttonCardClose.click()
    await planningPage.checkToDoExistInCalendar(deleteTimeSlot.title, 1)

    // delete time slot
    await planningPage.openToDoByName(deleteTimeSlot.title)
    await planningPage.deleteTimeSlot(0)
    await planningPage.buttonCardClose.click()
    await planningPage.checkToDoExistInCalendar(deleteTimeSlot.title, 0)

    // add a new time slot
    // TODO delete after fix UBERF-4273
    await page.reload()
    await planningNavigationMenuPage.buttonToDoAll.click()

    await planningPage.openToDoByName(deleteTimeSlot.title)
    if (deleteTimeSlot.slots != null) {
      await planningPage.buttonPanelCreateAddSlot.click({ force: true })
      await planningPage.setTimeSlot(0, deleteTimeSlot.slots[0])
    }
    await planningPage.buttonCardClose.click()
  })

  test('Plan work for several days', async ({ page }) => {
    const dateEndToday = new Date()
    const dateEndTomorrow = new Date()
    dateEndTomorrow.setDate(dateEndTomorrow.getDate() + 1)

    const toDoSeveralSlots: NewToDo = {
      title: 'Plan work for several days',
      slots: [
        {
          dateStart: 'today',
          timeStart: '1000',
          dateEnd: {
            day: dateEndToday.getDate().toString(),
            month: (dateEndToday.getMonth() + 1).toString(),
            year: dateEndToday.getFullYear().toString()
          },
          timeEnd: '1400'
        },
        {
          dateStart: `${dateEndTomorrow.getDate().toString()}`,
          timeStart: '1000',
          dateEnd: {
            day: dateEndTomorrow.getDate().toString(),
            month: (dateEndTomorrow.getMonth() + 1).toString(),
            year: dateEndTomorrow.getFullYear().toString()
          },
          timeEnd: '1400'
        }
      ]
    }

    const planningPage = new PlanningPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.buttonToDoAll.click()

    await planningPage.checkToDoExist(toDoSeveralSlots.title)
    await planningPage.openToDoByName(toDoSeveralSlots.title)
    if (toDoSeveralSlots.slots != null) {
      await planningPage.buttonPanelCreateAddSlot.click({ force: true })
      await planningPage.setTimeSlot(0, toDoSeveralSlots.slots[0])
      await planningPage.buttonPanelCreateAddSlot.click({ force: true })
      await planningPage.setTimeSlot(1, toDoSeveralSlots.slots[1])
    }
    await planningPage.buttonCardClose.click()

    await planningNavigationMenuPage.buttonToDoAll.click()
    await planningPage.openToDoByName(toDoSeveralSlots.title)
    await planningPage.checkTimeSlotEndDate(0, dateEndToday.getDate().toString())
    await planningPage.checkTimeSlotEndDate(1, dateEndTomorrow.getDate().toString())
  })
})
