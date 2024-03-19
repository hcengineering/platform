import { type Locator, type Page, expect } from '@playwright/test'
import { NewToDo, Slot } from './types'
import { CalendarPage } from '../calendar-page'

export class PlanningPage extends CalendarPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateNewToDo: Locator
  readonly inputPopupCreateTitle: Locator
  readonly inputPopupCreateDescription: Locator
  readonly inputPanelCreateDescription: Locator
  readonly buttonPopupCreateDueDate: Locator
  readonly buttonPanelCreateDueDate: Locator
  readonly buttonPopupCreatePriority: Locator
  readonly buttonPanelCreatePriority: Locator
  readonly buttonPopupCreateVisible: Locator
  readonly buttonPanelCreateVisible: Locator
  readonly buttonPopupCreateAddLabel: Locator
  readonly buttonPanelCreateAddLabel: Locator
  readonly buttonPopupCreateAddSlot: Locator
  readonly buttonPanelCreateAddSlot: Locator
  readonly buttonCalendarToday: Locator
  readonly buttonCreateToDo: Locator
  readonly inputCreateToDoTitle: Locator
  readonly buttonCardClose: Locator
  readonly textPanelToDoTitle: Locator
  readonly textPanelToDoDescription: Locator
  readonly textPanelDueDate: Locator
  readonly textPanelPriority: Locator
  readonly textPanelVisible: Locator
  readonly buttonPanelLabelFirst: Locator
  readonly buttonMenuDelete: Locator
  readonly buttonPopupSelectDateNextMonth: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.pageHeader = page.locator('div[class*="navigator"] div[class*="header"]', { hasText: 'Planning' })
    this.buttonCreateNewToDo = page.locator('div[class*="toDos-container"] button.button')
    this.inputPopupCreateTitle = page.locator('div.popup input')
    this.inputPopupCreateDescription = page.locator('div.popup div.tiptap')
    this.inputPanelCreateDescription = page.locator('div.hulyModal-container div.tiptap')
    this.buttonPopupCreateDueDate = page.locator(
      'div.popup div.block:first-child div.flex-row-center button:nth-child(3)'
    )
    this.buttonPanelCreateDueDate = page.locator(
      'div.hulyModal-container div.slots-content div.flex-row-top.justify-between div.flex-row-center button:first-child'
    )
    this.buttonPopupCreatePriority = page.locator('div.popup button#priorityButton')
    this.buttonPanelCreatePriority = page.locator('div.hulyModal-container button#priorityButton')
    this.buttonPopupCreateVisible = page.locator('div.popup button.type-button.menu', { hasText: 'visible' })
    this.buttonPanelCreateVisible = page.locator('div.hulyModal-container button.type-button.menu', {
      hasText: 'visible'
    })
    this.buttonPopupCreateAddLabel = page.locator('div.popup button.antiButton', { hasText: 'Add label' })
    this.buttonPanelCreateAddLabel = page.locator('.hulyHeader-titleGroup > button:nth-child(2)')
    this.buttonPopupCreateAddSlot = page.locator('div.popup button', { hasText: 'Add Slot' })
    this.buttonPanelCreateAddSlot = page.locator('div.hulyModal-container button', { hasText: 'Add Slot' })
    this.buttonCalendarToday = page.locator('div.popup div.calendar button.day.today')
    this.buttonCreateToDo = page.locator('div.popup button.antiButton', { hasText: 'Add ToDo' })
    this.inputCreateToDoTitle = page.locator('div.toDos-container input[placeholder="Add todo, press Enter to save"]')
    this.buttonCardClose = page.locator(
      '.hulyModal-container > .hulyHeader-container > .hulyHeader-buttonsGroup > .font-medium-14'
    )
    this.textPanelToDoTitle = page.locator(
      'div.hulyModal-container div.top-content label.editbox-wrapper.ghost.large input'
    )
    this.textPanelToDoDescription = page.locator('div.hulyModal-container div.top-content div.tiptap > p')
    this.textPanelDueDate = page.locator(
      'div.hulyModal-container div.slots-content div.flex-row-top.justify-between div.flex-row-center button:first-child span'
    )
    this.textPanelPriority = page.locator('div.hulyModal-container button#priorityButton svg')
    this.textPanelVisible = page.locator(
      'div.hulyModal-container div.hulyHeader-titleGroup > button:nth-child(3) > span'
    )
    this.buttonPanelLabelFirst = page.locator('div.hulyModal-container div.hulyHeader-titleGroup > button:nth-child(2)')
    this.buttonMenuDelete = page.locator('button.ap-menuItem span', { hasText: 'Delete' })
    this.buttonPopupSelectDateNextMonth = page.locator('div.popup div.header > div:last-child > button:last-child')
  }

  async createNewToDoFromInput (title: string): Promise<void> {
    await this.inputCreateToDoTitle.fill(title)
    await this.page.keyboard.press('Enter')
  }

  async createNewToDo (data: NewToDo): Promise<void> {
    await this.buttonCreateNewToDo.click()

    await this.inputPopupCreateTitle.fill(data.title)
    await this.updateToDo(data, true)

    await this.buttonCreateToDo.click()
  }

  async updateToDo (data: NewToDo, popup: boolean = false): Promise<void> {
    if (data.description != null) {
      await (popup
        ? this.inputPopupCreateDescription.fill(data.description)
        : this.inputPanelCreateDescription.fill(data.description))
    }
    if (data.duedate != null) {
      await (popup ? this.buttonPopupCreateDueDate.click() : this.buttonPanelCreateDueDate.click())
      if (data.duedate === 'today') {
        await this.buttonDatePopupToday.click()
      } else {
        await this.selectMenuItem(this.page, data.duedate)
      }
    }
    if (data.priority != null) {
      await (popup ? this.buttonPopupCreatePriority.click() : this.buttonPanelCreatePriority.click())
      await this.selectListItem(this.page, data.priority)
    }
    if (data.visible != null) {
      await (popup ? this.buttonPopupCreateVisible.click() : this.buttonPanelCreateVisible.click())
      await this.selectPopupItem(this.page, data.visible)
    }
    if (data.labels != null && data.createLabel != null) {
      await (popup ? this.buttonPopupCreateAddLabel.click() : this.buttonPanelCreateAddLabel.click())
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from createNewIssue')
      }
      await this.checkFromDropdownWithSearch(this.page, data.labels)
      await (popup ? this.buttonPopupCreateAddLabel.press('Escape') : this.buttonPanelCreateAddLabel.press('Escape'))
    }
    if (data.slots != null) {
      let index = 0
      for (const slot of data.slots) {
        await (popup
          ? this.buttonPopupCreateAddSlot.click({ force: true })
          : this.buttonPanelCreateAddSlot.click({ force: true }))
        await this.setTimeSlot(index, slot, popup)
        index++
      }
    }
  }

  public async setTimeSlot (rowNumber: number, slot: Slot, popup: boolean = false): Promise<void> {
    const p = popup
      ? 'div.popup div.horizontalBox div.end div.flex-col div.flex'
      : 'div.hulyModal-container div.slots-content div.flex-col div.flex'
    const row = this.page.locator(p).nth(rowNumber)

    // dateStart
    await row.locator('div.dateEditor-container:nth-child(1) button:first-child').click()
    if (slot.dateStart === 'today') {
      await this.buttonCalendarToday.click()
    } else {
      if (slot.dateStart === '1') {
        await this.buttonPopupSelectDateNextMonth.click()
      }
      await this.page
        .locator('div.popup div.calendar button.day')
        .filter({ has: this.page.locator(`text="${slot.dateStart}"`) })
        .click()
    }
    // timeStart
    const hours = slot.timeStart.substring(0, 2)
    const minutes = slot.timeStart.substring(2, slot.timeStart.length)
    await row
      .locator('div.dateEditor-container:nth-child(1) button:last-child span.digit:first-child')
      .click({ delay: 200 })
    await row
      .locator('div.dateEditor-container:nth-child(1) button:last-child span.digit:first-child')
      .pressSequentially(hours, { delay: 100 })
    await row
      .locator('div.dateEditor-container:nth-child(1) button:last-child span.digit:last-child')
      .click({ delay: 200 })
    await row
      .locator('div.dateEditor-container:nth-child(1) button:last-child span.digit:last-child')
      .pressSequentially(minutes, { delay: 100 })

    // dateEnd + timeEnd
    await row.locator('div.dateEditor-container.difference button').click()
    await this.fillSelectDatePopup(slot.dateEnd.day, slot.dateEnd.month, slot.dateEnd.year, slot.timeEnd)
  }

  private async checkTimeSlot (rowNumber: number, slot: Slot, popup: boolean = false): Promise<void> {
    const p = popup
      ? 'div.popup div.horizontalBox div.end div.flex-col div.flex'
      : 'div.hulyModal-container div.slots-content div.flex-col div.flex'
    const row = this.page.locator(p).nth(rowNumber)
    // timeStart
    await expect(row.locator('div.dateEditor-container:nth-child(1) button:last-child div.datetime-input')).toHaveText(
      slot.timeStart
    )
    // timeEnd
    await expect(row.locator('div.dateEditor-container.difference button > div:first-child')).toHaveText(slot.timeEnd)
  }

  async openToDoByName (toDoName: string): Promise<void> {
    await this.page.locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName }).click()
  }

  async checkToDoNotExist (toDoName: string): Promise<void> {
    await expect(
      this.page.locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName })
    ).toHaveCount(0)
  }

  async checkToDoExist (toDoName: string): Promise<void> {
    await expect(
      this.page.locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName })
    ).toHaveCount(1)
  }

  async checkToDo (data: NewToDo): Promise<void> {
    await expect(this.textPanelToDoTitle).toHaveValue(data.title)
    if (data.description != null) {
      await expect(this.textPanelToDoDescription).toHaveText(data.description)
    }
    if (data.duedate != null) {
      await expect(this.textPanelDueDate).toHaveText(data.duedate)
    }
    if (data.priority != null) {
      const classAttribute = await this.textPanelPriority.getAttribute('class')
      expect(classAttribute).toContain(data.priority)
    }
    if (data.visible != null) {
      await expect(this.textPanelVisible).toHaveText(data.visible)
    }
    if (data.labels != null) {
      await this.buttonPanelLabelFirst.click()
      await this.checkPopupItem(this.page, data.labels)
      await this.buttonPanelLabelFirst.click({ force: true })
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
      .locator('div.flex-row-center button.hulyToDoLine-dragbox')
      .click({ button: 'right' })
    await this.buttonMenuDelete.click()
    await this.pressYesDeletePopup(this.page)
  }

  async selectToDoByName (toDoName: string): Promise<void> {
    await this.page
      .locator('button.hulyToDoLine-container div[class$="overflow-label"]', { hasText: toDoName })
      .locator('xpath=..')
      .locator('div.flex-row-center div.hulyToDoLine-checkbox > label')
      .click()
  }

  async checkToDoExistInCalendar (toDoName: string, count: number): Promise<void> {
    await expect(
      this.page.locator('div.calendar-element > div.event-container >> div[class*="label"]', { hasText: toDoName })
    ).toHaveCount(count)
  }

  public async deleteTimeSlot (rowNumber: number): Promise<void> {
    const row = this.page
      .locator('div.hulyModal-container div.slots-content div.flex-col div.flex div.tool')
      .nth(rowNumber)
    await row.locator('xpath=..').hover()
    await row.locator('button').click()
    await this.pressYesDeletePopup(this.page)
  }

  public async checkTimeSlotEndDate (rowNumber: number, dateEnd: string): Promise<void> {
    const row = this.page.locator('div.hulyModal-container div.slots-content div.flex-col div.flex').nth(rowNumber)
    // dateEnd
    await expect(row.locator('div.dateEditor-container:nth-child(1) button:first-child')).toContainText(dateEnd)
  }
}
