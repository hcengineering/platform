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

  trackerApplicationButton = (): Locator => this.page.locator('[id="app-tracker\\:string\\:TrackerApplication"]')
  componentsLink = (): Locator => this.page.locator('text=Components')
  createComponentButton = (): Locator => this.page.getByRole('button', { name: 'Component', exact: true })
  componentNameInput = (): Locator => this.page.locator('[placeholder="Component\\ name"]')
  createComponentConfirmButton = (): Locator => this.page.locator('button:has-text("Create component")')
  newIssueButton = (): Locator => this.page.locator('button:has-text("New issue")')
  issueTitleInput = (): Locator => this.page.locator('[placeholder="Issue\\ title"]')
  componentIssueButton = (): Locator => this.page.locator('form button:has-text("Component")')
  createIssueButton = (): Locator => this.page.locator('form button:has-text("Create issue")')
  componentName = (componentName: string): Locator => this.page.locator(`text=${componentName}`)
  panelSelector = (panel: string): Locator => this.page.locator(`text="${panel}"`)
  viewButton = (): Locator => this.page.locator('button:has-text("View")')
  firstOptionButton = (): Locator => this.page.locator('.antiCard >> button >> nth=0')
  assigneeMenuItem = (): Locator => this.page.locator('.menu-item:has-text("Assignee")')
  header = (): Locator => this.page.getByText('Issues All Active Backlog')
  filter = (): Locator => this.page.getByRole('button', { name: 'Filter' })
  view = (): Locator => this.page.getByRole('button', { name: 'View' })
  showMore = (): Locator => this.page.getByRole('button', { name: 'Show' })
  task1 = (): Locator => this.page.getByRole('link', { name: 'Welcome to Huly! 🌟' })
  task2 = (): Locator => this.page.getByRole('link', { name: 'Create your first Project 📌' })
  task3 = (): Locator => this.page.getByRole('link', { name: 'Create your first Issue 📝' })
  task4 = (): Locator => this.page.getByRole('link', { name: 'Schedule your first Todo 📆' })
  task5 = (): Locator => this.page.getByRole('link', { name: 'Explore all Huly has to offer' })

  // Actions
  async selectPanelAndViewlet (panel: string, viewletSelector: string): Promise<void> {
    await this.page.click(`text="${panel}"`)
    await this.page.click(viewletSelector)
  }

  async openViewOptionsAndSelectAssignee (): Promise<void> {
    await this.viewButton().click()
    await this.firstOptionButton().click()
    await this.assigneeMenuItem().click()
    await this.page.keyboard.press('Escape')
  }

  async verifyViewOption (panel: string, viewletSelector: string): Promise<void> {
    await this.page.click(`text="${panel}"`)
    const viewlet = this.page.locator(viewletSelector)
    await expect(viewlet).toHaveClass(/selected/)
    await this.viewButton().click()
    await expect(this.firstOptionButton()).toContainText('Assignee')
    await this.page.keyboard.press('Escape')
  }

  async navigateToComponents (PlatformURI: string): Promise<void> {
    await this.trackerApplicationButton().click()
    await this.componentsLink().first().click()
    await expect(this.page).toHaveURL(
      `${PlatformURI}/workbench/sanity-ws/tracker/tracker%3Aproject%3ADefaultProject/components`
    )
  }

  async clickOnApplicationButton (): Promise<void> {
    await this.trackerApplicationButton().click()
  }

  async createComponent (componentName: string): Promise<void> {
    await this.createComponentButton().click()
    await this.componentNameInput().click()
    await this.componentNameInput().fill(componentName)
    await this.createComponentConfirmButton().click()
    await this.page.click(`text=${componentName}`)
  }

  async clickOnComponent (componentName: string): Promise<void> {
    await this.componentName(componentName).click()
  }

  async createIssueForComponent (componentName: string): Promise<void> {
    await this.newIssueButton().click()
    await this.issueTitleInput().fill('issue')
    await this.componentIssueButton().click()
    await this.page.click(`.selectPopup button:has-text("${componentName}")`)
    await this.createIssueButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
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
    const srcset = await this.commentImg().getAttribute('alt')
    expect(srcset).toContain(fileName)
  }

  async checkCategoryHeader (categoryHeader: string): Promise<void> {
    await expect(this.textCategoryHeader()).toHaveText(categoryHeader)
  }

  async checkActionMissing (action: string): Promise<void> {
    await this.buttonMoreActions().click()
    await this.checkDropdownHasNo(this.page, action)
  }

  async checkIfMainPanelIsVisible (): Promise<void> {
    await expect(this.header()).toBeVisible({ timeout: 60000 })
    await expect(this.filter()).toBeVisible()
    await expect(this.view()).toBeVisible()
    await expect(this.showMore()).toBeVisible()
  }

  async checkIfTasksAreVisable (): Promise<void> {
    await expect(this.task1()).toBeVisible()
    await expect(this.task2()).toBeVisible()
    await expect(this.task3()).toBeVisible()
    await expect(this.task4()).toBeVisible()
    await expect(this.task5()).toBeVisible()
  }
}
