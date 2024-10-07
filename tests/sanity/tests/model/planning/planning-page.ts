import { type Locator, type Page, expect } from '@playwright/test'
import { NewToDo, Slot } from './types'
import { CalendarPage } from '../calendar-page'

const retryOptions = { intervals: [1000, 1500, 2500], timeout: 60000 }

export class PlanningPage extends CalendarPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  private readonly popup = (): Locator => this.page.locator('div.popup')
  private readonly panel = (): Locator => this.page.locator('div.hulyModal-container')
  private readonly toDosContainer = (): Locator => this.page.locator('div.toDos-container')
  private readonly schedule = (): Locator => this.page.locator('div.hulyComponent.modal')
  private readonly sidebarSchedule = (): Locator => this.page.locator('#sidebar .calendar-container')
  readonly pageHeader = (): Locator =>
    this.page.locator('div[class*="navigator"] div[class*="header"]', { hasText: 'Planning' })

  readonly buttonCreateNewToDo = (): Locator => this.toDosContainer().locator('button.button')
  readonly inputPopupCreateTitle = (): Locator => this.popup().locator('input[type="text"]')
  readonly inputPopupCreateDescription = (): Locator => this.popup().locator('div.tiptap')
  readonly inputPanelCreateDescription = (): Locator => this.panel().locator('div.tiptap')
  readonly buttonPopupCreateDueDate = (): Locator => this.popup().locator('button#dueDateButton')
  readonly buttonPanelCreateDueDate = (): Locator => this.panel().locator('button#dueDateButton')
  readonly buttonPopupCreatePriority = (): Locator => this.popup().locator('button#priorityButton')
  readonly buttonPanelCreatePriority = (): Locator => this.panel().locator('button#priorityButton')
  readonly buttonPopupCreateVisible = (): Locator => this.popup().locator('button#visibleButton')
  readonly buttonPanelCreateVisible = (): Locator => this.panel().locator('button#visibleButton')
  readonly buttonPopupVisibleToEveryone = (): Locator =>
    this.popup().getByRole('button', { name: 'Visible to everyone' })

  readonly buttonCreateRelatedIssue = (): Locator => this.page.locator('.popup button:has-text("New related issue")')

  readonly buttonPopupOnlyVisibleToYou = (): Locator =>
    this.popup().getByRole('button', { name: 'Only visible to you' })

  readonly buttonPopupSave = (): Locator => this.popup().getByRole('button', { name: 'Save' })
  readonly buttonPopupCreateAddLabel = (): Locator =>
    this.popup().locator('button.antiButton', { hasText: 'Add label' })

  readonly buttonPanelCreateAddLabel = (): Locator =>
    this.panel().locator('.hulyHeader-titleGroup > button:nth-child(2)')

  readonly buttonPopupCreateAddSlot = (): Locator => this.popup().locator('button', { hasText: 'Add Slot' })
  readonly buttonPanelCreateAddSlot = (): Locator => this.panel().locator('button', { hasText: 'Add Slot' })
  readonly buttonCalendarToday = (): Locator => this.popup().locator('div.calendar button.day.today')
  readonly buttonCreateToDo = (): Locator => this.popup().locator('button.antiButton', { hasText: 'Add Action Item' })
  readonly inputCreateToDoTitle = (): Locator =>
    this.toDosContainer().locator('input[placeholder="Add Action Item, press Enter to save"]')

  readonly buttonCardClose = (): Locator =>
    this.panel().locator('.hulyHeader-container > .hulyHeader-buttonsGroup > .font-medium-14')

  readonly textPanelToDoTitle = (): Locator =>
    this.panel().locator('div.top-content label.editbox-wrapper.ghost.large input')

  readonly textPanelToDoDescription = (): Locator => this.panel().locator('div.top-content div.tiptap > p')
  readonly textPanelDueDate = (): Locator =>
    this.panel().locator(
      'div.slots-content div.flex-row-top.justify-between div.flex-row-center .hulyButton:first-child span'
    )

  readonly textPanelPriority = (): Locator => this.panel().locator('button#priorityButton svg')
  readonly textPanelVisible = (): Locator =>
    this.panel().locator('div.hulyHeader-titleGroup > button:nth-child(3) > span')

  readonly buttonPanelLabelFirst = (): Locator =>
    this.panel().locator('div.hulyHeader-titleGroup > button:nth-child(2)')

  readonly buttonMenuDelete = (): Locator => this.page.locator('button.ap-menuItem span', { hasText: 'Delete' })
  readonly buttonPopupSelectDateNextMonth = (): Locator =>
    this.popup().locator('div.month-container > div.header > div:last-child > button:last-child')

  readonly buttonPopupSelectDatePrevMonth = (): Locator =>
    this.popup().locator('div.month-container > div.header > div:last-child > button:first-child')

  readonly buttonPrevDayInSchedule = (): Locator =>
    this.page
      .locator('div.hulyHeader-container', { hasText: 'Schedule:' })
      .locator('div.hulyHeader-buttonsGroup > button:first-child')

  readonly buttonNextDayInSchedule = (): Locator =>
    this.page
      .locator('div.hulyHeader-container', { hasText: 'Schedule:' })
      .locator('div.hulyHeader-buttonsGroup > button:last-child')

  readonly selectInputToDo = (): Locator =>
    this.toDosContainer().getByPlaceholder('Add Action Item, press Enter to save')

  readonly selectTimeCell = (time: string, column: number = 1): Locator =>
    this.schedule().locator(`div.time-cell:text-is('${time}')`).locator(`xpath=following::div[${column}]`)

  readonly eventInSchedule = (title: string): Locator =>
    this.schedule().locator('div.event-container', { hasText: title })

  readonly eventInSidebarSchedule = (title: string): Locator =>
    this.sidebarSchedule().locator('div.event-container', { hasText: title })

  readonly toDoInToDos = (hasText: string): Locator =>
    this.toDosContainer().locator('button.hulyToDoLine-container', { hasText })

  readonly checkboxToDoInToDos = (hasText: string): Locator =>
    this.toDoInToDos(hasText).locator('div.hulyToDoLine-checkbox')

  readonly buttonTagByName = (tagName: string): Locator =>
    this.page.locator(`#navGroup-tags button:has-text("${tagName}")`)

  readonly labelToDoReference = (toDoName: string): Locator =>
    this.page
      .locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName })
      .locator('xpath=..')
      .locator('button.reference')

  async clickButtonPrevDayInSchedule (): Promise<void> {
    await this.buttonPrevDayInSchedule().click()
  }

  async clickButtonNextDayInSchedule (): Promise<void> {
    await this.buttonNextDayInSchedule().click()
  }

  async dragToCalendar (title: string, column: number, time: string, addHalf: boolean = false): Promise<void> {
    await this.toDosContainer().getByRole('button', { name: title }).hover()

    await expect(async () => {
      await this.page.mouse.down()
      const boundingBox = await this.selectTimeCell(time, column).boundingBox()
      expect(boundingBox).toBeTruthy()
      if (boundingBox != null) {
        await this.page.mouse.move(boundingBox.x + 10, boundingBox.y + 10)
        await this.page.mouse.move(boundingBox.x + 10, boundingBox.y + (addHalf ? 40 : 20))
        await this.page.mouse.up()
      }
    }).toPass(retryOptions)
  }

  async moveToDoBorderByMouse (
    title: string,
    column: number,
    targetTime: string,
    size: 'top' | 'bottom'
  ): Promise<void> {
    await this.page
      .locator(`.calendar-element:has-text("${title}") .calendar-element-${size === 'top' ? 'start' : 'end'}`)
      .hover()

    await expect(async () => {
      await this.page.mouse.down()
      const boundingBox = await this.selectTimeCell(targetTime, column).boundingBox()
      expect(boundingBox).toBeTruthy()
      if (boundingBox != null) {
        await this.page.mouse.move(boundingBox.x + 10, size === 'bottom' ? boundingBox.y - 8 : boundingBox.y + 5)
        await this.page.mouse.up()
      }
    }).toPass(retryOptions)
  }

  async checkInSchedule (title: string): Promise<void> {
    await expect(this.eventInSchedule(title)).toBeVisible()
  }

  async markDoneInToDos (title: string): Promise<void> {
    await this.toDoInToDos(title).hover()
    await this.checkboxToDoInToDos(title).hover()
    await this.checkboxToDoInToDos(title).click()
  }

  async clickButtonCreateAddSlot (): Promise<void> {
    await this.buttonPanelCreateAddSlot().click({ force: true })
  }

  async clickButtonCardClose (): Promise<void> {
    await this.buttonCardClose().click()
  }

  async createNewToDoFromInput (title: string): Promise<void> {
    await this.inputCreateToDoTitle().fill(title)
    await this.page.keyboard.press('Enter')
  }

  async createNewToDo (data: NewToDo): Promise<void> {
    await this.buttonCreateNewToDo().click()

    await this.inputPopupCreateTitle().fill(data.title)
    await this.updateToDo(data, true)

    await this.buttonCreateToDo().click()
  }

  async updateToDo (data: NewToDo, popup: boolean = false): Promise<void> {
    if (data.description != null) {
      await (popup
        ? this.inputPopupCreateDescription().fill(data.description)
        : this.inputPanelCreateDescription().fill(data.description))
    }
    if (data.duedate != null) {
      await (popup ? this.buttonPopupCreateDueDate().click() : this.buttonPanelCreateDueDate().click())
      if (data.duedate === 'today') {
        await this.clickButtonDatePopupToday()
      } else {
        await this.selectMenuItem(this.page, data.duedate)
      }
    }
    if (data.priority != null) {
      await (popup ? this.buttonPopupCreatePriority().click() : this.buttonPanelCreatePriority().click())
      await this.selectListItem(data.priority)
    }
    if (data.visible != null) {
      await (popup ? this.buttonPopupCreateVisible().click() : this.buttonPanelCreateVisible().click())
      await this.selectPopupItem(data.visible)
    }
    if (data.labels != null && data.createLabel != null) {
      await (popup ? this.buttonPopupCreateAddLabel().click() : this.buttonPanelCreateAddLabel().click())
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from createNewIssue')
        await this.page.locator('.popup#TagsPopup').press('Escape')
      } else {
        await this.checkFromDropdownWithSearch(this.page, data.labels)
      }
    }
    if (data.slots != null) {
      let index = 0
      for (const slot of data.slots) {
        await (popup
          ? this.buttonPopupCreateAddSlot().click({ force: true })
          : this.buttonPanelCreateAddSlot().click({ force: true }))
        await this.setTimeSlot(index, slot, popup)
        index++
      }
    }
  }

  public async setTimeSlot (rowNumber: number, slot: Slot, popup: boolean = false): Promise<void> {
    const p = popup
      ? 'div.popup div.horizontalBox div.end div.scroller-container div.box div.flex-between.min-w-full'
      : 'div.hulyModal-container div.slots-content div.scroller-container div.box div.flex-between.min-w-full'
    const row = this.page.locator(p).nth(rowNumber)

    // dateStart
    await row.locator('div.dateEditor-container:first-child > div.min-w-28:first-child .hulyButton').click()
    if (slot.dateStart === 'today') {
      await this.buttonCalendarToday().click()
    } else if (typeof slot.dateStart === 'string') {
      if (slot.dateStart === '1') {
        await this.buttonPopupSelectDateNextMonth().click()
      }
      await this.page
        .locator('div.popup div.calendar button.day')
        .filter({ has: this.page.locator(`text="${slot.dateStart}"`) })
        .click()
    } else {
      const today = new Date()
      const target = new Date(
        parseInt(slot.dateStart.year, 10),
        parseInt(slot.dateStart.month, 10) - 1,
        parseInt(slot.dateStart.day, 10)
      )
      const before: boolean = target.getTime() < today.getTime()
      const diffYear: number = Math.abs(target.getFullYear() - today.getFullYear())
      const diffMonth: number =
        diffYear === 0
          ? Math.abs(target.getMonth() - today.getMonth())
          : (diffYear - 1) * 12 +
            (before ? today.getMonth() + 12 - target.getMonth() : target.getMonth() + 12 - today.getMonth())
      for (let i = 0; i < diffMonth; i++) {
        if (before) await this.buttonPopupSelectDatePrevMonth().click()
        else await this.buttonPopupSelectDateNextMonth().click()
      }
      await this.page
        .locator('div.popup div.calendar button.day')
        .filter({ has: this.page.locator(`text="${target.getDate()}"`) })
        .click()
    }
    // timeStart
    const hours = slot.timeStart.substring(0, 2)
    const minutes = slot.timeStart.substring(2, slot.timeStart.length)
    await row.locator('div.dateEditor-container:nth-child(1) .hulyButton span.digit:first-child').focus()
    await row
      .locator('div.dateEditor-container:nth-child(1) .hulyButton span.digit:first-child')
      .pressSequentially(hours, { delay: 100 })
    await row.locator('div.dateEditor-container:nth-child(1) .hulyButton span.digit:last-child').focus()
    await row
      .locator('div.dateEditor-container:nth-child(1) .hulyButton span.digit:last-child')
      .pressSequentially(minutes, { delay: 100 })

    // dateEnd + timeEnd
    await row.locator('div.dateEditor-container.difference .hulyButton').click()
    await this.fillSelectDatePopup(slot.dateEnd.day, slot.dateEnd.month, slot.dateEnd.year, slot.timeEnd)
  }

  private async checkTimeSlot (rowNumber: number, slot: Slot, popup: boolean = false): Promise<void> {
    const p = popup
      ? 'div.popup div.horizontalBox div.end div.scroller-container div.box div.flex-between.min-w-full'
      : 'div.hulyModal-container div.slots-content div.scroller-container div.box div.flex-between.min-w-full'
    const row = this.page.locator(p).nth(rowNumber)
    // timeStart
    await expect(
      row.locator('div.dateEditor-container:nth-child(1) .hulyButton:last-child div.datetime-input')
    ).toHaveText(slot.timeStart)
    // timeEnd
    await expect(row.locator('div.dateEditor-container.difference .hulyButton > div:first-child')).toHaveText(
      slot.timeEnd
    )
  }

  async openToDoByName (toDoName: string): Promise<void> {
    await this.page.locator(`button.hulyToDoLine-container:has-text("${toDoName}")`).click()
  }

  async checkToDoNotExist (toDoName: string): Promise<void> {
    await expect(this.page.locator(`button.hulyToDoLine-container:has-text("${toDoName}")`)).toHaveCount(0)
  }

  async checkToDoExist (toDoName: string): Promise<void> {
    await expect(this.page.locator(`button.hulyToDoLine-container:has-text("${toDoName}")`)).toHaveCount(1)
  }

  async checkToDoExistAndShowDuration (toDoName: string, duration: string): Promise<void> {
    await expect(
      this.page.locator(`button.hulyToDoLine-container:has-text("${toDoName}"):has-text("${duration}")`)
    ).toHaveCount(1)
  }

  async checkToDo (data: NewToDo): Promise<void> {
    await expect(this.textPanelToDoTitle()).toHaveValue(data.title)
    if (data.description != null) {
      await expect(this.textPanelToDoDescription()).toHaveText(data.description)
    }
    if (data.duedate != null) {
      await expect(this.textPanelDueDate()).toHaveText(data.duedate)
    }
    if (data.priority != null) {
      const classAttribute = await this.textPanelPriority().getAttribute('class')
      expect(classAttribute).toContain(data.priority)
    }
    if (data.visible != null) {
      await expect(this.textPanelVisible()).toHaveText(data.visible)
    }
    if (data.labels != null) {
      await this.buttonPanelLabelFirst().click()
      await this.checkPopupItem(data.labels)
      await this.buttonPanelLabelFirst().click({ force: true })
    }
    if (data.slots != null) {
      let index = 0
      for (const slot of data.slots) {
        await this.checkTimeSlot(index, slot)
        index++
      }
    }
  }

  async deleteToDoByName (toDoName: string): Promise<void> {
    await this.page.locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName }).hover()
    await this.page
      .locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName })
      .locator('xpath=..')
      .locator('div.hulyToDoLine-statusPriority button.hulyToDoLine-dragbox')
      .click({ button: 'right' })
    await this.buttonMenuDelete().click()
    await this.pressYesDeletePopup(this.page)
  }

  async selectToDoByName (toDoName: string): Promise<void> {
    await this.page
      .locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName })
      .locator('xpath=..')
      .locator('div.hulyToDoLine-checkbox > label')
      .click()
  }

  async openReferenceToDoByName (toDoName: string): Promise<void> {
    await this.labelToDoReference(toDoName).click()
  }

  async getReferenceNameToDoByName (toDoName: string): Promise<null | string> {
    return await this.labelToDoReference(toDoName).textContent()
  }

  async checkIfReferenceIsOpen (toDoName: string): Promise<void> {
    const referenceName = await this.getReferenceNameToDoByName(toDoName)
    await this.openReferenceToDoByName(toDoName)
    await expect(this.page.locator(`.popupPanel .hulyHeader-row:has-text("${referenceName}")`)).toBeVisible()
  }

  async clickButtonTagByName (tagName: string): Promise<void> {
    await this.buttonTagByName(tagName).click()
  }

  async checkToDoExistInCalendar (toDoName: string, count: number): Promise<void> {
    await expect(
      this.page.locator('div.calendar-element > div.event-container >> div[class*="label"]', { hasText: toDoName })
    ).toHaveCount(count)
  }

  public async deleteTimeSlot (rowNumber: number): Promise<void> {
    const row = this.page
      .locator(
        'div.hulyModal-container div.slots-content div.scroller-container div.box div.flex-between.min-w-full button[data-id="btnDelete"]'
      )
      .nth(rowNumber)
    await row.click()
    await this.pressYesDeletePopup(this.page)
  }

  public async checkTimeSlotEndDate (rowNumber: number, dateEnd: string): Promise<void> {
    const row = this.page
      .locator('div.hulyModal-container div.slots-content div.scroller-container div.box div.flex-between.min-w-full')
      .nth(rowNumber)
    // dateEnd
    await expect(
      row.locator('div.dateEditor-container:first-child > div.min-w-28:first-child .hulyButton')
    ).toContainText(dateEnd)
  }
}
