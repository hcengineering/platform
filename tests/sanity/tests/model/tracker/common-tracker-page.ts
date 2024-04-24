import { expect, Locator, Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'
import { DateDivided } from './types'
import path from 'path'

export class CommonTrackerPage extends CalendarPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  privatebuttonFilter = (): Locator => this.page.locator('div.search-start > div:first-child button')
  inputComment = (): Locator => this.page.locator('div.text-input div.tiptap')
  buttonSendComment = (): Locator => this.page.locator('g#Send')
  textComment = (): Locator => this.page.locator('div.showMore-content p')
  textActivity = (): Locator => this.page.locator('div.header')
  buttonSpaceSelectorMoveIssuesModal = (): Locator =>
    this.page.locator('form[id="tracker:string:MoveIssues"] button[id="space.selector"]')

  buttonMoveIssuesModal = (): Locator => this.page.locator('form[id="tracker:string:MoveIssues"] button[type="submit"]')
  buttonKeepOriginalMoveIssuesModal = (): Locator =>
    this.page.locator('form[id="tracker:string:MoveIssues"] span.toggle-switch')

  inputKeepOriginalMoveIssuesModal = (): Locator =>
    this.page.locator('form[id="tracker:string:MoveIssues"] input[type="checkbox"]')

  buttonMoreActions = (): Locator => this.page.locator('div.popupPanel-title div.flex-row-center > button:first-child')
  textActivityContent = (): Locator => this.page.locator('div.activityMessage div.content')
  linkInActivity = (): Locator => this.page.locator('div[id="activity:string:Activity"] a')
  inputCommentFile = (): Locator => this.page.locator('input#file')
  fileUploadName = (fileName: string): Locator =>
    this.page.locator('div[slot="header"] div.item div.name', { hasText: fileName })

  commentImg = (): Locator => this.page.locator('div.activityMessage div.content img')
  inputFilterTitle = (): Locator => this.page.locator('div.selectPopup input[placeholder="Title"]')
  buttonFilterApply = (): Locator => this.page.locator('div.selectPopup button[type="button"]', { hasText: 'Apply' })
  buttonClearFilters = (): Locator => this.page.locator('button > span', { hasText: 'Clear filters' })
  textCategoryHeader = (): Locator =>
    this.page.locator('div.category-container > div.categoryHeader span[class*="label"]')

  buttonFilter = (): Locator => this.page.locator('div.search-start > div:first-child button')
  selectPopupMenu = (filter: string): Locator =>
    this.page.locator('div.selectPopup [class*="menu"]', { hasText: filter })

  popupCalendarButton = (dateStart: string): Locator =>
    this.page.locator('div.popup div.calendar button.day', { hasText: dateStart })

  dateInputFirstChild = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:first-child')

  dateInputThirdChild = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:nth-child(3)')

  dateInputFifthChild = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:nth-child(5)')

  submitDatePopup = (): Locator => this.page.locator('div.date-popup-container button[type="submit"]')
  filterButton = (index: number): Locator => this.page.locator(`div.filter-section button:nth-child(${index})`)
  calendarDay = (daySelector: string): Locator => this.page.locator(`div.popup div.calendar button.day${daySelector}`)
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

  async selectFilter (filter: string, filterSecondLevel?: string): Promise<void> {
    await this.buttonFilter().click()
    await this.selectPopupMenu(filter).click()

    if (filterSecondLevel !== null && typeof filterSecondLevel === 'string') {
      switch (filter) {
        case 'Title':
          await this.inputFilterTitle().fill(filterSecondLevel)
          await this.buttonFilterApply().click()
          break
        case 'Labels':
          await this.selectFromDropdown(this.page, filterSecondLevel)
          break
        default:
          await this.selectPopupMenu(filterSecondLevel).click()
      }
    }
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

  async addComment (comment: string): Promise<void> {
    await this.inputComment().fill(comment)
    await this.buttonSendComment().click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(this.textComment().filter({ hasText: comment }).first()).toBeVisible()
  }

  async checkActivityExist (activity: string): Promise<void> {
    await expect(this.textActivity().filter({ hasText: activity }).first()).toBeVisible()
  }

  async fillMoveIssuesModal (newProjectName: string, keepOriginalAttributes: boolean = false): Promise<void> {
    await this.buttonSpaceSelectorMoveIssuesModal().click()
    await this.selectMenuItem(this.page, newProjectName)

    if (keepOriginalAttributes) {
      await this.buttonKeepOriginalMoveIssuesModal().click()
    }

    await this.buttonMoveIssuesModal().click({ delay: 1000 })
  }

  async addMentions (mention: string): Promise<void> {
    await this.inputComment().fill(`@${mention}`)
    await this.selectMention(mention)
    await this.buttonSendComment().click()
  }

  async checkActivityContentExist (activityContent: string): Promise<void> {
    await expect(this.textActivityContent().filter({ hasText: activityContent })).toBeVisible()
  }

  async openLinkFromActivitiesByText (linkText: string): Promise<void> {
    await this.linkInActivity().filter({ hasText: linkText }).click()
  }

  async addCommentWithImage (comment: string, fileName: string): Promise<void> {
    await this.inputComment().fill(comment)
    await this.inputCommentFile().setInputFiles(path.join(__dirname, `../../files/${fileName}`))
    await expect(this.fileUploadName(fileName)).toBeVisible()
    await this.buttonSendComment().click()
  }

  async checkCommentWithImageExist (commentHeader: string, fileName: string): Promise<void> {
    await this.checkActivityExist(commentHeader)
    const srcset = await this.commentImg().getAttribute('srcset')
    expect(srcset).toContain(fileName)
  }

  async checkCategoryHeader (categoryHeader: string): Promise<void> {
    await expect(this.textCategoryHeader()).toHaveText(categoryHeader)
  }

  async checkActionMissing (action: string): Promise<void> {
    await this.buttonMoreActions().click()
    await this.checkDropdownHasNo(this.page, action)
  }
}
