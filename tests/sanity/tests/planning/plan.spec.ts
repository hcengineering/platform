import { expect, test } from '@playwright/test'
import {
  generateId,
  PlatformSetting,
  PlatformURI,
  generateTestData,
  getTimeForPlanner,
  getSecondPageByInvite,
  getInviteLink
} from '../utils'
import { PlanningPage } from '../model/planning/planning-page'
import { NewToDo } from '../model/planning/types'
import { PlanningNavigationMenuPage } from '../model/planning/planning-navigation-menu-page'
import { SignUpData } from '../model/common-types'
import { TestData } from '../chat/types'
import { faker } from '@faker-js/faker'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { ApiEndpoint } from '../API/Api'
import { LoginPage } from '../model/login-page'
import { SidebarPage } from '../model/sidebar-page'
import { TeamPage } from '../model/team-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { ChannelPage } from '../model/channel-page'
import { IssuesPage } from '../model/tracker/issues-page'
import { NewIssue } from '../model/tracker/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Planning ToDo tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/time`))?.finished()
  })

  test('Add several slots for the same day', async ({ page }) => {
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
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    await planningPage.checkToDoExist(toDoSeveralSlots.title)
    await planningPage.openToDoByName(toDoSeveralSlots.title)

    if (toDoSeveralSlots.slots != null) {
      await planningPage.clickButtonCreateAddSlot()
      await planningPage.setTimeSlot(0, toDoSeveralSlots.slots[0])
      await planningPage.clickButtonCreateAddSlot()
      await planningPage.setTimeSlot(1, toDoSeveralSlots.slots[1])
    }
    await planningPage.clickButtonCardClose()

    await test.step('User is able to create Related Issue for Action Item', async () => {
      const issuesPage = new IssuesPage(page)
      const leftMenuPage = new LeftSideMenuPage(page)
      const relatedIssueData: NewIssue = {
        title: `ToDo Related Issue ${generateId()}`,
        description: 'Description',
        projectName: 'Default'
      }

      await planningPage.eventInSchedule(toDoSeveralSlots.title).first().click({ button: 'right' })
      await planningPage.buttonCreateRelatedIssue().click()

      await issuesPage.fillNewIssueForm(relatedIssueData)
      await issuesPage.clickButtonCreateIssue()
      await leftMenuPage.clickTracker()
      await issuesPage.clickLinkSidebarAll()
      await issuesPage.searchIssueByName(relatedIssueData.title)

      await (await page.goto(`${PlatformURI}/workbench/sanity-ws/time`))?.finished()
    })

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
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    const planningPage = new PlanningPage(page)
    await planningPage.checkToDoExist(deleteTimeSlot.title)
    await planningPage.openToDoByName(deleteTimeSlot.title)

    if (deleteTimeSlot.slots != null) {
      await planningPage.clickButtonCreateAddSlot()
      await planningPage.setTimeSlot(0, deleteTimeSlot.slots[0])
    }
    await planningPage.clickButtonCardClose()
    await planningPage.checkToDoExistInCalendar(deleteTimeSlot.title, 1)

    // delete time slot
    await planningPage.openToDoByName(deleteTimeSlot.title)
    await planningPage.deleteTimeSlot(0)
    await planningPage.clickButtonCardClose()
    await planningPage.checkToDoExistInCalendar(deleteTimeSlot.title, 0)

    // add a new time slot
    // TODO delete after fix UBERF-4273
    await page.reload()
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    await planningPage.openToDoByName(deleteTimeSlot.title)
    if (deleteTimeSlot.slots != null) {
      await planningPage.clickButtonCreateAddSlot()
      await planningPage.setTimeSlot(0, deleteTimeSlot.slots[0])
    }
    await planningPage.clickButtonCardClose()
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
    await planningNavigationMenuPage.clickOnButtonToDoAll()

    await planningPage.checkToDoExist(toDoSeveralSlots.title)
    await planningPage.openToDoByName(toDoSeveralSlots.title)
    if (toDoSeveralSlots.slots != null) {
      await planningPage.clickButtonCreateAddSlot()
      await planningPage.setTimeSlot(0, toDoSeveralSlots.slots[0])
      await planningPage.clickButtonCreateAddSlot()
      await planningPage.setTimeSlot(1, toDoSeveralSlots.slots[1])
    }
    await planningPage.clickButtonCardClose()

    await planningNavigationMenuPage.clickOnButtonToDoAll()
    await planningPage.openToDoByName(toDoSeveralSlots.title)
    await planningPage.checkTimeSlotEndDate(0, dateEndToday.getDate().toString())
    await planningPage.checkTimeSlotEndDate(1, dateEndTomorrow.getDate().toString())
  })

  test('Adding ToDo by dragging and checking visibility in the Team Planner', async ({ browser, page, request }) => {
    const data: TestData = generateTestData()
    const leftMenuPage = new LeftSideMenuPage(page)
    const channelPage = new ChannelPage(page)

    const newUser2: SignUpData = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: '1234'
    }
    const titleV = `Visible ToDo ${generateId()}`
    const titleI = `Inisible ToDo ${generateId()}`
    const time = getTimeForPlanner()
    const time2 = getTimeForPlanner(1)

    const leftSideMenuPage: LeftSideMenuPage = new LeftSideMenuPage(page)
    const loginPage: LoginPage = new LoginPage(page)
    const api: ApiEndpoint = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    await (await page.goto(`${PlatformURI}/login/login`))?.finished()
    await loginPage.login(data.userName, '1234')
    const swp = new SelectWorkspacePage(page)
    await swp.selectWorkspace(data.workspaceName)
    // await (await page.goto(`${PlatformURI}/workbench/${data.workspaceName}`))?.finished()
    await leftSideMenuPage.clickPlanner()

    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    await planningNavigationMenuPage.clickOnButtonToDoAll()
    const planningPage = new PlanningPage(page)

    await planningPage.selectInputToDo().fill(titleV)
    await planningPage.selectInputToDo().press('Enter')
    await planningPage.dragToCalendar(titleV, 2, time)
    await planningPage.eventInSchedule(titleV).click()
    await planningPage.buttonPopupCreateVisible().click()
    await planningPage.buttonPopupVisibleToEveryone().click()
    await planningPage.buttonPopupSave().click()

    await test.step('User is able to create multiple by dragging slots to the same Action Item', async () => {
      await planningPage.dragToCalendar(titleV, 3, time2)
      await planningPage.checkToDoExistInCalendar(titleV, 2)
    })

    await planningPage.selectInputToDo().fill(titleI)
    await planningPage.selectInputToDo().press('Enter')
    await planningPage.dragToCalendar(titleI, 2, time, true)
    await planningPage.eventInSchedule(titleI).click()
    await planningPage.buttonPopupCreateVisible().click()
    await planningPage.buttonPopupOnlyVisibleToYou().click()
    await planningPage.buttonPopupSave().click()

    const linkText = await getInviteLink(page)
    await api.createAccount(newUser2.email, newUser2.password, newUser2.firstName, newUser2.lastName)
    using _page2 = await getSecondPageByInvite(browser, linkText, newUser2)
    const page2 = _page2.page
    const leftSideMenuPageSecond = new LeftSideMenuPage(page2)

    await leftSideMenuPageSecond.clickTeam()
    const teamPage = new TeamPage(page2)
    await teamPage.checkTeamPageIsOpened()
    await teamPage.selectTeam('Default')
    await teamPage.buttonNextDay().click()
    await page2
      .locator('div.hulyComponent div.item', { hasText: 'Tomorrow' })
      .locator('div.item', { hasText: 'Busy 30m' })
      .isVisible()

    await test.step('Go to another page to check work in Sidebar', async () => {
      await leftMenuPage.clickChunter()
      await channelPage.clickChannel('general')
    })

    const sidebarPage = new SidebarPage(page)

    await test.step('Check visibility of task in sidebar planner', async () => {
      await sidebarPage.clickSidebarPageButton('calendar')
      await sidebarPage.checkIfPlanerSidebarTabIsOpen(true)
    })

    await test.step('Change event title from sidebar calendar', async () => {
      await sidebarPage.plannerSidebarNextDayButton().click()
      await planningPage.eventInSidebarSchedule(titleV).click()
      await planningPage.buttonPopupCreateVisible().click()
      await planningPage.buttonPopupOnlyVisibleToYou().click()
      await planningPage.buttonPopupSave().click()
    })
  })

  test('ToDo labels are exist in Tag list', async ({ page }) => {
    const planningPage = new PlanningPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)

    const toDoWithLabel: NewToDo = {
      title: `ToDo with label-${generateId()}`,
      description: 'Description for ToDo with label',
      duedate: 'today',
      priority: 'Medium',
      visible: 'FreeBusy',
      labels: `TAG-${generateId()}`,
      createLabel: true
    }

    const toDoWithoutLabel: NewToDo = {
      title: `ToDo without label-${generateId()}`,
      description: 'Description for ToDo without label',
      duedate: 'today',
      priority: 'Medium',
      visible: 'FreeBusy'
    }

    await test.step('Prepare ToDo with label', async () => {
      await planningNavigationMenuPage.clickOnButtonToDoAll()
      await planningPage.createNewToDo(toDoWithLabel)
      await planningPage.openToDoByName(toDoWithLabel.title)
      await planningPage.updateToDo(toDoWithLabel)
      await planningPage.clickButtonCardClose()
    })

    await test.step('Prepare ToDo without label', async () => {
      await planningNavigationMenuPage.clickOnButtonToDoAll()
      await planningPage.createNewToDo(toDoWithoutLabel)
    })

    await test.step('Labels are added to tag list', async () => {
      await planningPage.checkToDoExist(toDoWithLabel.title)
      await planningPage.checkToDoExist(toDoWithoutLabel.title)

      if (typeof toDoWithLabel.labels === 'string') {
        await expect(planningPage.buttonTagByName(toDoWithLabel.labels)).toBeVisible()
      }
    })

    await test.step('Click to the tag and filter todos', async () => {
      if (typeof toDoWithLabel.labels === 'string') {
        await planningPage.clickButtonTagByName(toDoWithLabel.labels)
        await planningPage.checkToDoExist(toDoWithLabel.title)
        await planningPage.checkToDoNotExist(toDoWithoutLabel.title)
      }
    })
  })

  test('Change ToDo start and end times by dragging', async ({ page }) => {
    const planningPage = new PlanningPage(page)
    const planningNavigationMenuPage = new PlanningNavigationMenuPage(page)
    const today = new Date()
    const date = new Date()
    date.setDate(date.getDate() + 3)
    const time = getTimeForPlanner(0, 2)
    const timeStart = getTimeForPlanner(-1, 2)
    const timeEnd = getTimeForPlanner(2, 2)

    const toDoWithLabel: NewToDo = {
      title: `ToDo to change duration-${generateId()}`,
      description: 'Description for ToDo to change duration'
    }

    await test.step('Prepare ToDo', async () => {
      await planningNavigationMenuPage.clickOnButtonToDoAll()
      await planningPage.createNewToDo(toDoWithLabel)
      const diff = date.getTime() - today.getTime()
      for (let i = 0; i < Math.abs(diff) / 86400000; i++) {
        if (diff < 0) await planningPage.clickButtonPrevDayInSchedule()
        else await planningPage.clickButtonNextDayInSchedule()
      }
      await planningPage.dragToCalendar(toDoWithLabel.title, 1, time)
    })

    await test.step('Resize ToDo', async () => {
      await planningPage.moveToDoBorderByMouse(toDoWithLabel.title, 1, timeEnd, 'bottom')
      await planningPage.moveToDoBorderByMouse(toDoWithLabel.title, 1, timeStart, 'top')
    })

    await test.step('Check time changes', async () => {
      await planningNavigationMenuPage.clickOnButtonToDoAll()
      await planningPage.checkToDoExistAndShowDuration(toDoWithLabel.title, '3h')
    })
  })

  test('User is able to open Planner in Sidebar', async ({ page }) => {
    const leftMenuPage = new LeftSideMenuPage(page)
    const channelPage = new ChannelPage(page)

    await test.step('Go to any another page', async () => {
      await leftMenuPage.clickChunter()
      await channelPage.clickChannel('general')
    })

    await test.step('Open planner via sidebar icon button', async () => {
      const sidebarPage = new SidebarPage(page)
      await sidebarPage.clickSidebarPageButton('calendar')
      await sidebarPage.checkIfPlanerSidebarTabIsOpen(true)
    })
  })
})
