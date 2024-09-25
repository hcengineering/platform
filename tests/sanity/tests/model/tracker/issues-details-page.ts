import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { Issue, NewIssue } from './types'
import { convertEstimation } from '../../tracker/tracker.utils'

export class IssuesDetailsPage extends CommonTrackerPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly issueTitle = (): Locator => this.page.locator('div.hulyHeader-container div.title')
  readonly inputTitle = (): Locator => this.page.locator('div.popupPanel-body input[type="text"]')
  readonly inputDescription = (): Locator => this.page.locator('div.popupPanel-body div.textInput div.tiptap')
  readonly textIdentifier = (): Locator => this.page.locator('div.title.not-active')
  readonly buttonStatus = (): Locator => this.page.locator('//span[text()="Status"]/../button[1]//span')
  readonly buttonPriority = (): Locator => this.page.locator('//span[text()="Priority"]/../button[2]//span')
  readonly buttonAssignee = (): Locator => this.page.locator('(//span[text()="Assignee"]/../div/button)[2]')
  readonly textLabels = (): Locator => this.page.locator('div.step-container div.listitems-container')
  readonly buttonAddLabel = (): Locator => this.page.locator('button.tag-button')
  readonly buttonComponent = (): Locator =>
    this.page.locator('//span[text()="Component"]/following-sibling::div[1]/div/button')

  readonly buttonMilestone = (): Locator =>
    this.page.locator('//span[text()="Milestone"]/following-sibling::div[1]/div/button')

  readonly textEstimation = (): Locator =>
    this.page.locator('//span[text()="Estimation"]/following-sibling::div[1]/button/span')

  readonly buttonEstimation = (): Locator => this.page.locator('(//span[text()="Estimation"]/../div/button)[3]')
  readonly buttonCreatedBy = (): Locator =>
    this.page.locator('//span[text()="Created by"]/following-sibling::div[1]/button')

  readonly buttonCloseIssue = (): Locator => this.page.locator('#btnPClose')
  readonly textParentTitle = (): Locator => this.page.locator('span.issue-title')
  readonly buttonAddSubIssue = (): Locator => this.page.locator('#add-sub-issue')
  readonly textRelated = (): Locator =>
    this.page.locator('//span[text()="Related"]/following-sibling::div[1]/div//span')

  readonly buttonCollaborators = (): Locator =>
    this.page.locator('//span[text()="Collaborators"]/following-sibling::div[1]/button')

  readonly buttonIssueOnSearchForIssueModal = (): Locator =>
    this.page.locator('div.popup div.tabs > div.tab:last-child')

  readonly inputSearchOnSearchForIssueModal = (): Locator => this.page.locator('div.popup input[type="text"]')
  readonly textBlockedBy = (): Locator =>
    this.page.locator('//span[text()="Blocked by"]/following-sibling::div[1]/div/div/button/span')

  readonly textBlocks = (): Locator =>
    this.page.locator('//span[text()="Blocks"]/following-sibling::div[1]/div/div/button/span')

  readonly buttonRemoveBlockedBy = (): Locator =>
    this.page.locator('//span[text()="Blocked by"]/following-sibling::div[1]/div/button')

  readonly details = (): Locator =>
    this.page.locator('//span[text()="Blocked by"]/following-sibling::div[1]/div/button')

  readonly popup = (): Locator => this.page.locator('.selectPopup')
  readonly popupListItems = (issueTitle: string): Locator =>
    this.page.locator('div.popup div.list-item', { hasText: issueTitle })

  readonly antiPopupSubMenueBtn = (actionFirst: string): Locator =>
    this.page.locator('button.antiPopup-submenu', { hasText: actionFirst })

  readonly stateHistoryDropdown = (nameDr: string): Locator => {
    return this.popup().locator(this.page.getByRole('button', { name: nameDr }))
  }

  readonly rowDecriptionToDo = (hasText: string): Locator => this.page.locator('div.tiptap div.todo-item', { hasText })
  readonly assigneeToDo = (hasText: string): Locator => this.rowDecriptionToDo(hasText).locator('div.assignee')
  readonly checkboxToDo = (hasText: string): Locator => this.rowDecriptionToDo(hasText).locator('input.chBox')
  readonly slashActionItemsPopup = (): Locator => this.page.locator('.selectPopup')

  async clickCloseIssueButton (): Promise<void> {
    await this.buttonCloseIssue().click()
  }

  async clickButtonAddSubIssue (): Promise<void> {
    await this.buttonAddSubIssue().click()
  }

  async clickRemoveBlockedBy (): Promise<void> {
    await this.buttonRemoveBlockedBy().click()
  }

  async editIssue (data: Issue): Promise<void> {
    if (data.title != null) {
      await this.inputTitle().fill(data.title)
    }
    if (data.status != null) {
      await this.buttonStatus().click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.priority != null) {
      await this.buttonPriority().click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonAssignee().click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      if (data.createLabel) {
        await this.buttonAddLabel().click()
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from editIssue')
      } else {
        await this.checkFromDropdownWithSearch(this.page, data.labels)
      }
      await this.inputTitle().press('Escape')
    }
    if (data.component != null) {
      await this.buttonComponent().click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.milestone != null) {
      await this.buttonMilestone().click()
      await this.selectMenuItem(this.page, data.milestone)
    }
    if (data.estimation != null) {
      await this.buttonEstimation().click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
  }

  async checkIssue (data: NewIssue): Promise<void> {
    await expect(this.inputTitle()).toHaveValue(data.title)
    await expect(this.inputDescription()).toHaveText(data.description)
    if (data.status != null) {
      await expect(this.buttonStatus()).toHaveText(data.status)
    }
    if (data.priority != null) {
      await expect(this.buttonPriority()).toHaveText(data.priority)
    }
    if (data.assignee != null) {
      await expect(this.buttonAssignee()).toHaveText(data.assignee)
    }
    if (data.labels != null) {
      await expect(this.textLabels()).toHaveText(data.labels)
    }
    if (data.component != null) {
      await expect(this.buttonComponent()).toHaveText(data.component)
    }
    if (data.milestone != null) {
      await expect(this.buttonMilestone()).toHaveText(data.milestone === 'No Milestone' ? 'Milestone' : data.milestone)
    }
    if (data.estimation != null) {
      await expect(this.textEstimation()).toHaveText(convertEstimation(data.estimation))
    }
    if (data.parentIssue != null) {
      await expect(this.textParentTitle()).toHaveText(data.parentIssue)
    }
    if (data.relatedIssue != null) {
      await expect(this.textRelated()).toContainText(data.relatedIssue)
    }
    if (data.blockedBy != null) {
      await expect(this.textBlockedBy()).toContainText(data.blockedBy)
    }
    if (data.blocks != null) {
      await expect(this.textBlocks()).toContainText(data.blocks)
    }
  }

  async moreActionOnIssue (action: string): Promise<void> {
    await this.buttonMoreActions().click()
    await this.selectFromDropdown(this.page, action)
  }

  async waitDetailsOpened (issueTitle: string): Promise<void> {
    await this.page.waitForSelector(`div[class*="main"] div:has-text("${issueTitle}")`)
  }

  async openSubIssueByName (issueName: string): Promise<void> {
    await this.page.locator('div.listGrid a', { hasText: issueName }).click()
  }

  async checkIssueContainsAttachment (fileName: string): Promise<void> {
    await this.page.locator('div.attachment-grid div.name', { hasText: fileName }).click()
  }

  async checkCollaborators (names: Array<string>): Promise<void> {
    await this.buttonCollaborators().click()
    for (const name of names) {
      await expect(this.stateHistoryDropdown(name)).toBeVisible()
    }
    await this.inputTitle().click({ force: true })
  }

  async checkCollaboratorsCount (count: string): Promise<void> {
    await expect(this.buttonCollaborators()).toHaveText(count)
  }

  async addToDescription (description: string): Promise<void> {
    const existDescription = await this.inputDescription().textContent()
    await expect(this.inputDescription()).toHaveJSProperty('contentEditable', 'true')
    await this.inputDescription().fill(`${existDescription}\n${description}`)
  }

  async openShowMoreLink (activityHeader: string, position: number = 0): Promise<void> {
    await this.textActivity().filter({ hasText: activityHeader }).locator('xpath=..').locator('div.showMore').click()
  }

  async checkComparingTextAdded (text: string): Promise<void> {
    await expect(this.page.locator('span.text-editor-highlighted-node-add', { hasText: text }).first()).toBeVisible()
  }

  async fillSearchForIssueModal (issueTitle: string): Promise<void> {
    await this.buttonIssueOnSearchForIssueModal().click()
    await this.inputSearchOnSearchForIssueModal().fill(issueTitle)
    await this.popupListItems(issueTitle).click()
  }

  async moreActionOnIssueWithSecondLevel (actionFirst: string, actionSecond: string): Promise<void> {
    await this.buttonMoreActions().click()
    await this.antiPopupSubMenueBtn(actionFirst).hover()
    await this.antiPopupSubMenueBtn(actionFirst).click()
    await this.selectFromDropdown(this.page, actionSecond)
  }

  async checkIfTextBlockedByIsVisible (): Promise<void> {
    await expect(this.textBlockedBy()).toBeVisible({ visible: false })
  }

  async checkIfButtonCreatedByHaveRealName (modifierName: string): Promise<void> {
    await expect(this.buttonCreatedBy()).toHaveText(modifierName)
  }

  async checkIfButtonComponentHasTextDefaultComponent (defaultComponent: string): Promise<void> {
    await expect(this.buttonComponent()).toHaveText(defaultComponent)
  }

  async checkIfButtonCbuttonCreatedByHaveTextCreatedBy (createdBy: string): Promise<void> {
    await expect(this.buttonCreatedBy()).toHaveText(createdBy)
  }

  async assignToDo (user: string, text: string): Promise<void> {
    await this.rowDecriptionToDo(text).hover()
    await this.assigneeToDo(text).click()
    await this.selectListItem(user)
  }
}
