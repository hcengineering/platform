import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { Issue, NewIssue } from './types'

export class IssuesDetailsPage extends CommonTrackerPage {
  readonly page: Page
  readonly inputTitle: Locator
  readonly inputDescription: Locator
  readonly buttonStatus: Locator
  readonly buttonPriority: Locator
  readonly buttonAssignee: Locator
  readonly textLabels: Locator
  readonly buttonAddLabel: Locator
  readonly buttonComponent: Locator
  readonly buttonMilestone: Locator
  readonly textEstimation: Locator
  readonly buttonEstimation: Locator
  readonly buttonCreatedBy: Locator
  readonly buttonCloseIssue: Locator
  readonly textParentTitle: Locator
  readonly buttonAddSubIssue: Locator
  readonly textRelated: Locator
  readonly buttonCollaborators: Locator
  readonly buttonIssueOnSearchForIssueModal: Locator
  readonly inputSearchOnSearchForIssueModal: Locator
  readonly textBlockedBy: Locator
  readonly textBlocks: Locator
  readonly buttonRemoveBlockedBy: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputTitle = page.locator('div.popupPanel-body input[type="text"]')
    this.inputDescription = page.locator('div.popupPanel-body div.textInput p')
    this.buttonStatus = page.locator('//span[text()="Status"]/../button[1]//span')
    this.buttonPriority = page.locator('//span[text()="Priority"]/../button[2]//span')
    this.buttonAssignee = page.locator('(//span[text()="Assignee"]/../div/button)[2]')
    this.textLabels = page.locator('div.step-container div.listitems-container')
    this.buttonAddLabel = page.locator('button.tag-button')
    this.buttonComponent = page.locator('//span[text()="Component"]/following-sibling::div[1]/div/button')
    this.buttonMilestone = page.locator('//span[text()="Milestone"]/following-sibling::div[1]/div/button')
    this.textEstimation = page.locator('//span[text()="Estimation"]/following-sibling::div[1]/button/span')
    this.buttonEstimation = page.locator('(//span[text()="Estimation"]/../div/button)[3]')
    this.buttonCreatedBy = page.locator('//span[text()="Created by"]/following-sibling::div[1]/button')
    this.buttonCloseIssue = page.locator('#btnPClose')
    this.textParentTitle = page.locator('span.issue-title')
    this.buttonAddSubIssue = page.locator('#add-sub-issue')
    this.textRelated = page.locator('//span[text()="Related"]/following-sibling::div[1]/div//span')
    this.buttonCollaborators = page.locator('//span[text()="Collaborators"]/following-sibling::div[1]/button')
    this.buttonIssueOnSearchForIssueModal = page.locator('div.popup div.tabs > div.tab:last-child')
    this.inputSearchOnSearchForIssueModal = page.locator('div.popup input[type="text"]')
    this.textBlockedBy = page.locator('//span[text()="Blocked by"]/following-sibling::div[1]/div/div/button/span')
    this.textBlocks = page.locator('//span[text()="Blocks"]/following-sibling::div[1]/div/div/button/span')
    this.buttonRemoveBlockedBy = page.locator('//span[text()="Blocked by"]/following-sibling::div[1]/div/button')
  }

  async editIssue (data: Issue): Promise<void> {
    if (data.status != null) {
      await this.buttonStatus.click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.priority != null) {
      await this.buttonPriority.click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonAssignee.click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      if (data.createLabel) {
        await this.buttonAddLabel.click()
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from editIssue')
      } else {
        await this.checkFromDropdownWithSearch(this.page, data.labels)
      }
      await this.inputTitle.press('Escape')
    }
    if (data.component != null) {
      await this.buttonComponent.click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.milestone != null) {
      await this.buttonMilestone.click()
      await this.selectMenuItem(this.page, data.milestone)
    }
    if (data.estimation != null) {
      await this.buttonEstimation.click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
  }

  async checkIssue (data: NewIssue): Promise<void> {
    await expect(this.inputTitle).toHaveValue(data.title)
    await expect(this.inputDescription).toHaveText(data.description)
    if (data.status != null) {
      await expect(this.buttonStatus).toHaveText(data.status)
    }
    if (data.priority != null) {
      await expect(this.buttonPriority).toHaveText(data.priority)
    }
    if (data.assignee != null) {
      await expect(this.buttonAssignee).toHaveText(data.assignee)
    }
    if (data.labels != null) {
      await expect(this.textLabels).toHaveText(data.labels)
    }
    if (data.component != null) {
      await expect(this.buttonComponent).toHaveText(data.component)
    }
    if (data.milestone != null) {
      await expect(this.buttonMilestone).toHaveText(data.milestone)
    }
    if (data.estimation != null) {
      await expect(this.textEstimation).toHaveText(data.estimation)
    }
    if (data.parentIssue != null) {
      await expect(this.textParentTitle).toHaveText(data.parentIssue)
    }
    if (data.relatedIssue != null) {
      await expect(this.textRelated).toContainText(data.relatedIssue)
    }
    if (data.blockedBy != null) {
      await expect(this.textBlockedBy).toContainText(data.blockedBy)
    }
    if (data.blocks != null) {
      await expect(this.textBlocks).toContainText(data.blocks)
    }
  }

  async moreActionOnIssue (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, action)
  }

  async waitDetailsOpened (issueTitle: string): Promise<void> {
    await this.page.waitForSelector(`div[class*="main"] div:has-text("${issueTitle}")`)
  }

  async openSubIssueByName (issueName: string): Promise<void> {
    await this.page.locator('div.main div.listGrid a', { hasText: issueName }).click()
  }

  async checkIssueContainsAttachment (fileName: string): Promise<void> {
    await this.page.locator('div.attachment-grid div.name', { hasText: fileName }).click()
  }

  async checkCollaborators (names: Array<string>): Promise<void> {
    await this.buttonCollaborators.click()
    for (const name of names) {
      await expect(
        this.page
          .locator('//div[contains(@class, "popup")]//span[@class="label"]//div[contains(@class, "text-left")]', {
            hasText: name
          })
          .locator('xpath=../../../../..')
          .locator('div.check div')
      ).toBeVisible()
    }
    await this.inputTitle.click({ force: true })
  }

  async checkCollaboratorsCount (count: string): Promise<void> {
    await expect(this.buttonCollaborators).toHaveText(count)
  }

  async addToDescription (description: string): Promise<void> {
    const existDescription = await this.inputDescription.textContent()
    await this.inputDescription.fill(`${existDescription}\n${description}`)
  }

  async openShowMoreLink (activityHeader: string, position: number = 0): Promise<void> {
    await this.textActivity.filter({ hasText: activityHeader }).locator('xpath=..').locator('div.showMore').click()
  }

  async checkComparingTextAdded (text: string): Promise<void> {
    await expect(this.page.locator('span.text-editor-highlighted-node-add', { hasText: text }).first()).toBeVisible()
  }

  async fillSearchForIssueModal (issueTitle: string): Promise<void> {
    await this.buttonIssueOnSearchForIssueModal.click()
    await this.inputSearchOnSearchForIssueModal.fill(issueTitle)
    await this.page.locator('div.popup div.list-item', { hasText: issueTitle }).click()
  }

  async moreActionOnIssueWithSecondLevel (actionFirst: string, actionSecond: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.page.locator('button.antiPopup-submenu', { hasText: actionFirst }).hover()
    await this.page.locator('button.antiPopup-submenu', { hasText: actionFirst }).click()
    await this.selectFromDropdown(this.page, actionSecond)
  }
}
