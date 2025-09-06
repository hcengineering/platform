import { expect, Locator, Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'
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

  buttonMoreActions = (): Locator =>
    this.page.locator('.popupPanel > .hulyHeader-container button[data-id="btnMoreActions"]')

  textActivityContent = (): Locator => this.page.locator('div.activityMessage div.content')
  linkInActivity = (): Locator => this.page.locator('div[id="activity:string:Activity"] a')
  inputCommentFile = (): Locator => this.page.locator('input#file')
  fileUploadName = (fileName: string): Locator =>
    this.page.locator('div[slot="header"] div.item div.name', { hasText: fileName })

  commentImg = (): Locator => this.page.locator('div.activityMessage div.content img')
  textCategoryHeader = (): Locator =>
    this.page.locator('div.category-container > div.categoryHeader span[class*="label"]')

  popupCalendarButton = (dateStart: string): Locator =>
    this.page.locator('div.popup div.calendar button.day', { hasText: dateStart })

  dateInputFirstChild = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:first-child')

  dateInputThirdChild = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:nth-child(3)')

  dateInputFifthChild = (): Locator =>
    this.page.locator('div.date-popup-container div.input:first-child span.digit:nth-child(5)')

  submitDatePopup = (): Locator => this.page.locator('div.date-popup-container button[type="submit"]')

  trackerApplicationButton = (): Locator => this.page.locator('[id="app-tracker\\:string\\:TrackerApplication"]')
  componentsLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Components')
  createComponentButton = (): Locator => this.page.getByRole('button', { name: 'Component', exact: true })
  componentNameInput = (): Locator => this.page.locator('[placeholder="Component\\ name"]')
  createComponentConfirmButton = (): Locator => this.page.locator('button:has-text("Create component")')
  newIssueButton = (): Locator => this.page.locator('button:has-text("New issue")')
  issueTitleInput = (): Locator => this.page.locator('[placeholder="Issue\\ title"]')
  componentIssueButton = (): Locator => this.page.locator('form button:has-text("Component")')
  createIssueButton = (): Locator => this.page.locator('form button:has-text("Create issue")')
  componentName = (componentName: string): Locator => this.page.locator(`text=${componentName}`)
  panelSelector = (panel: string): Locator => this.page.locator(`text="${panel}"`)
  viewButton = (): Locator => this.page.locator('button[data-id="btn-viewOptions"]')
  firstOptionButton = (): Locator => this.page.locator('.antiCard >> button >> nth=0')
  assigneeMenuItem = (): Locator => this.page.locator('.menu-item:has-text("Assignee")')
  shouldShowAllToggle = (): Locator =>
    this.page.locator('.antiCard.menu .antiCard-menu__item:has-text("Show empty groups")')

  header = (): Locator =>
    this.page.locator('button.hulyBreadcrumb-container > span.hulyBreadcrumb-label', { hasText: 'Issues' })

  view = (): Locator => this.page.locator('.hulyHeader-buttonsGroup > button[data-id="btn-viewOptions"]')
  showMore = (): Locator => this.page.locator('.hulyHeader-buttonsGroup > button[data-id="btn-viewSetting"]')
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
    await this.closePopup()
  }

  async closePopup (): Promise<void> {
    while (await this.page.locator('.popup').isVisible()) {
      await this.page.keyboard.press('Escape')
    }
  }

  async openViewOptionsAndToggleShouldShowAll (): Promise<void> {
    await this.viewButton().click()
    await this.shouldShowAllToggle().click()
    await this.page.keyboard.press('Escape')
  }

  async verifyViewOption (panel: string, viewletSelector: string): Promise<void> {
    await this.page.click(`text="${panel}"`)
    const viewlet = this.page.locator(viewletSelector)
    await expect(viewlet.locator('input')).toBeChecked()
    await this.viewButton().click()
    await expect(this.firstOptionButton()).toContainText('Assignee')
    await this.closePopup()
  }

  async navigateToComponents (PlatformURI: string): Promise<void> {
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
    await this.linkInActivity().filter({ hasText: linkText }).first().click()
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
    await expect(this.buttonFilter()).toBeVisible()
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
