import { type Locator, type Page, expect } from '@playwright/test'
import { DateDivided } from './types'

export class CommonPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  selectPopupInput = (): Locator => this.page.locator('div.selectPopup input')
  selectPopupInputSearch = (): Locator => this.page.locator('div.popup input.search')
  selectPopupListItem = (name: string): Locator => this.page.locator('div.selectPopup div.list-item', { hasText: name })
  selectPopupListItemFirst = (): Locator => this.page.locator('div.selectPopup div.list-item')
  selectPopupApMenuItem = (hasText: string): Locator => this.page.locator('div.popup button.ap-menuItem', { hasText })
  selectPopupAddButton = (): Locator => this.page.locator('div.selectPopup button[data-id="btnAdd"]')
  selectPopupButton = (): Locator => this.page.locator('div.selectPopup button')
  selectPopupExpandButton = (): Locator => this.page.locator('div.selectPopup button[data-id="btnExpand"]')
  popupSpanLabel = (point: string): Locator =>
    this.page.locator(`div[class$="opup"] span[class*="label"]:has-text("${point}")`)

  readonly inputSearchIcon = (): Locator => this.page.locator('.searchInput-icon')

  selectPopupSpanLines = (item: string): Locator =>
    this.page.locator('div.selectPopup span[class^="lines"]', { hasText: item })

  popupButtonChannelOk = (): Locator => this.page.locator('div.popup button#channel-ok')
  viewStringDeleteObjectButtonPrimary = (): Locator =>
    this.page.locator('form[id="view:string:DeleteObject"] button.primary')

  tagsStringAddTagForm = (field: string): Locator =>
    this.page.locator(`div.popup form[id="tags:string:AddTag"] input[placeholder$="${field}"]`)

  tagsStringAddTagButtonSubmit = (): Locator =>
    this.page.locator('div.popup form[id="tags:string:AddTag"] button[type="submit"]')

  notifyContainerButton = (): Locator => this.page.locator('div.notifyPopup button[data-id="btnNotifyClose"]').first()
  errorSpan = (): Locator => this.page.locator('div.ERROR span')
  infoSpan = (): Locator => this.page.locator('div.INFO span')
  popupSubmitButton = (): Locator => this.page.locator('div.popup button[type="submit"]')
  historyBoxButtonFirst = (): Locator => this.page.locator('div.history-box button:first-child')
  inboxNotyButton = (): Locator => this.page.locator('button[id$="Inbox"] > div.noty')
  mentionPopupListItem = (mentionName: string): Locator =>
    this.page.locator('form.mentionPoup div.list-item', { hasText: mentionName })

  hulyPopupRowButton = (name: string): Locator =>
    this.page.locator('div.hulyPopup-container button.hulyPopup-row', { hasText: name })

  cardCloseButton = (): Locator => this.page.locator('div.popup button[id="card-close"]')
  menuPopupItemButton = (itemText: string): Locator =>
    this.page.locator('div.selectPopup button.menu-item', { hasText: itemText })

  buttonFilter = (): Locator => this.page.getByRole('button', { name: 'Filter' })
  inputFilterTitle = (): Locator => this.page.locator('div.selectPopup input[placeholder="Title"]')
  inputFilterName = (): Locator => this.page.locator('div.selectPopup input[placeholder="Name"]')
  inputSearch = (): Locator => this.page.locator('div.selectPopup input[placeholder="Search..."]')
  buttonFilterApply = (): Locator => this.page.locator('div.selectPopup button[type="button"]', { hasText: 'Apply' })
  buttonClearFilters = (): Locator => this.page.locator('button > span', { hasText: 'Clear filters' })
  filterButton = (index: number): Locator => this.page.locator(`div.filter-section button:nth-child(${index})`)
  selectFilterSection = (label: string): Locator =>
    this.page.locator('div.filterbar-container div.filter-section', { hasText: label })

  selectPopupMenu = (filter: string): Locator =>
    this.page.locator('div.selectPopup [class*="menu"]', { hasText: filter })

  calendarDay = (daySelector: string): Locator => this.page.locator(`div.popup div.calendar button.day${daySelector}`)

  linesFromTable = (text: string = ''): Locator =>
    this.page.locator('.hulyComponent table tbody tr').filter({ hasText: text })

  linesFromList = (text: string = ''): Locator =>
    this.page.locator('.hulyComponent .list-container div.row').filter({ hasText: text })

  firstInputFirstDigit = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:first-child')

  firstInputThirdDigit = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:nth-child(3)')

  firstInputFifthDigit = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:nth-child(5)')

  lastInputFirstDigit = (): Locator =>
    this.page.locator('div.date-popup-container div.input:last-child span.digit:first-child')

  lastInputThirdDigit = (): Locator =>
    this.page.locator('div.date-popup-container div.input:last-child span.digit:nth-child(3)')

  lastInputFifthDigit = (): Locator =>
    this.page.locator('div.date-popup-container div.input:last-child span.digit:nth-child(5)')

  submitButton = (): Locator => this.page.locator('div.date-popup-container button[type="submit"]')
  buttonBreadcrumb = (hasText?: string): Locator => this.page.locator('button.hulyBreadcrumb-container', { hasText })
  appsShowMenuButton = (): Locator => this.page.locator('[id="app-workbench\\:string\\:ShowMenu"]')

  async openNavigator (): Promise<void> {
    const needOpenNavigator = await this.appsShowMenuButton().isVisible()
    if (needOpenNavigator) await this.appsShowMenuButton().click()
  }

  async selectMenuItem (page: Page, name: string, fullWordFilter: boolean = false): Promise<void> {
    if (name !== 'first') {
      const filterText = fullWordFilter ? name : name.split(' ')[0]
      await this.selectPopupInput().fill(filterText)
      // TODO need to remove after fixed UBERF-4968
      await page.waitForTimeout(300)
    }
    await this.selectPopupListItemFirst().first().click()
  }

  async pressCreateButtonSelectPopup (page: Page): Promise<void> {
    await this.selectPopupAddButton().click()
  }

  async pressShowAllButtonSelectPopup (page: Page): Promise<void> {
    await this.selectPopupExpandButton().click()
  }

  async selectFromDropdown (page: Page, point: string): Promise<void> {
    await this.popupSpanLabel(point).click()
  }

  async checkDropdownHasNo (page: Page, item: string): Promise<void> {
    await expect(this.selectPopupSpanLines(item)).not.toBeVisible()
  }

  async fillToDropdown (page: Page, input: string): Promise<void> {
    await this.selectPopupInputSearch().fill(input)
    await this.popupButtonChannelOk().click()
  }

  async fillToSelectPopup (page: Page, input: string): Promise<void> {
    await expect(this.selectPopupInput()).toBeVisible()
    await this.selectPopupInput().fill(input)
    await this.selectPopupButton().click()
  }

  async checkFromDropdown (page: Page, point: string): Promise<void> {
    await this.selectPopupSpanLines(point).first().click()
  }

  async pressYesDeletePopup (page: Page): Promise<void> {
    await this.viewStringDeleteObjectButtonPrimary().click()
  }

  async addNewTagPopup (page: Page, title: string, description: string): Promise<void> {
    await this.tagsStringAddTagForm('title').fill(title)
    await this.tagsStringAddTagForm('Please type description here').fill(description)
    await this.tagsStringAddTagButtonSubmit().click()
    await this.tagsStringAddTagButtonSubmit().waitFor({ state: 'hidden' })
  }

  async selectAssignee (page: Page, name: string): Promise<void> {
    if (name !== 'first') {
      await this.selectPopupInput().fill(name.split(' ')[0])
      await expect(this.selectPopupListItemFirst()).toHaveCount(1)
    }
    await this.selectPopupListItemFirst().first().click()
  }

  async checkExistNewNotification (): Promise<void> {
    await expect(this.inboxNotyButton()).toBeVisible()
  }

  async pressYesForPopup (page: Page): Promise<void> {
    await expect(this.popupSubmitButton()).toBeVisible()
    await this.popupSubmitButton().click()
  }

  async pressButtonBack (page: Page): Promise<void> {
    await this.historyBoxButtonFirst().click()
  }

  async checkFromDropdownWithSearch (page: Page, point: string): Promise<void> {
    await this.selectPopupInput().fill(point)
    await this.selectPopupSpanLines(point).click()
  }

  async closeNotification (): Promise<void> {
    while (await this.notifyContainerButton().isVisible()) {
      await this.notifyContainerButton().click()
    }
  }

  async checkError (page: Page, errorMessage: string): Promise<void> {
    await expect(this.errorSpan()).toHaveText(errorMessage)
  }

  async checkInfo (page: Page, errorMessage: string): Promise<void> {
    await expect(this.infoSpan()).toHaveText(errorMessage)
  }

  async checkInfoSectionNotExist (page: Page): Promise<void> {
    await expect(this.infoSpan()).not.toBeAttached()
  }

  async selectMention (mentionName: string): Promise<void> {
    await this.mentionPopupListItem(mentionName).click()
  }

  async selectListItem (name: string): Promise<void> {
    await this.selectPopupListItem(name).click({ delay: 100 })
  }

  async selectPopupAp (name: string): Promise<void> {
    await this.selectPopupApMenuItem(name).click({ delay: 100 })
  }

  async selectPopupItem (name: string): Promise<void> {
    await this.hulyPopupRowButton(name).click({ delay: 100 })
  }

  async closePopup (): Promise<void> {
    await this.cardCloseButton().click()
  }

  async checkPopupItem (itemText: string): Promise<void> {
    await expect(this.menuPopupItemButton(itemText)).toBeVisible()
  }

  async clickPopupItem (itemText: string): Promise<void> {
    await this.menuPopupItemButton(itemText).first().click()
  }

  async selectFilter (filter: string, filterSecondLevel?: string): Promise<void> {
    await this.buttonFilter().click()
    await this.selectPopupMenu(filter).click()

    if (filterSecondLevel !== null && typeof filterSecondLevel === 'string') {
      switch (filter) {
        case 'Title':
          await this.inputFilterTitle().fill(filterSecondLevel)
          await this.buttonFilterApply().click()
          break
        case 'Name':
          await this.inputFilterName().fill(filterSecondLevel)
          await this.buttonFilterApply().click()
          break
        case 'Labels':
          await this.selectFromDropdown(this.page, filterSecondLevel)
          break
        case 'Skills':
          await this.inputSearch().fill(filterSecondLevel)
          await this.selectFromDropdown(this.page, filterSecondLevel)
          await this.page.keyboard.press('Escape')
          break
        default:
          await this.selectPopupMenu(filterSecondLevel).click()
      }
    }
  }

  async filterOppositeCondition (filter: string, conditionBefore: string, conditionAfter: string): Promise<void> {
    const filterSection = this.selectFilterSection(filter)
    await filterSection.locator('button', { hasText: conditionBefore }).isVisible()
    await filterSection.locator('button[data-id="btnCondition"]').click()
    await this.page.locator('div.selectPopup button.menu-item', { hasText: conditionAfter }).click()
  }

  async checkFilter (filter: string, filterSecondLevel?: string, filterThirdLevel?: string): Promise<void> {
    await expect(this.filterButton(1)).toHaveText(filter)
    if (filterSecondLevel !== undefined) {
      await expect(this.filterButton(2)).toContainText(filterSecondLevel)
    }
    if (filterThirdLevel !== undefined) {
      await expect(this.filterButton(3)).toContainText(filterThirdLevel)
    }
  }

  async updateFilterDimension (
    filterSecondLevel: string,
    dateStart?: string,
    needToOpenCalendar: boolean = false
  ): Promise<void> {
    await this.filterButton(2).click()
    await this.selectPopupMenu(filterSecondLevel).click()

    if (dateStart !== undefined) {
      if (needToOpenCalendar) {
        await this.filterButton(3).click()
      }
      await this.calendarDay(dateStart === 'Today' ? '.today' : `:has-text("${dateStart}")`).click()
    }
  }

  async fillBetweenDate (dateStart: DateDivided, dateEnd: DateDivided): Promise<void> {
    // dateStart - day
    await this.firstInputFirstDigit().click({ delay: 100, position: { x: 1, y: 1 } })
    await this.firstInputFirstDigit().pressSequentially(dateStart.day)

    // dateStart - month
    await this.firstInputThirdDigit().click({ delay: 100, position: { x: 1, y: 1 } })
    await this.firstInputThirdDigit().pressSequentially(dateStart.month)

    // dateStart - year
    await this.firstInputFifthDigit().click({ delay: 100, position: { x: 1, y: 1 } })
    await this.firstInputFifthDigit().pressSequentially(dateStart.year)

    // dateEnd - day
    await this.lastInputFirstDigit().click({ delay: 100, position: { x: 1, y: 1 } })
    await this.lastInputFirstDigit().pressSequentially(dateEnd.day)

    // dateEnd - month
    await this.lastInputThirdDigit().click({ delay: 100, position: { x: 1, y: 1 } })
    await this.lastInputThirdDigit().pressSequentially(dateEnd.month)

    // dateEnd - year
    await this.lastInputFifthDigit().click({ delay: 100, position: { x: 1, y: 1 } })
    await this.lastInputFifthDigit().pressSequentially(dateEnd.year)

    // Submit
    await this.submitButton().click({ delay: 100 })
  }

  async checkRowsInTableExist (text: string, count: number = 1): Promise<void> {
    await expect(this.linesFromTable(text)).toHaveCount(count)
  }

  async checkRowsInTableNotExist (text: string): Promise<void> {
    await expect(this.linesFromTable(text)).toHaveCount(0)
  }

  async openRowInTableByText (text: string): Promise<void> {
    await this.linesFromTable(text).locator('a', { hasText: text }).click()
  }

  async checkRowsInListExist (text: string, count: number = 1): Promise<void> {
    await expect(this.linesFromList(text)).toHaveCount(count)
  }

  async pressEscape (): Promise<void> {
    await this.page.keyboard.press('Escape')
  }
}
