import { expect, type Locator, type Page } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

export class TemplatePage extends CommonTrackerPage {
  readonly page: Page
  readonly buttonNewTemplate: Locator
  readonly inputIssueTitle: Locator
  readonly inputIssueDescription: Locator
  readonly buttonPopupCreateNewTemplatePriority: Locator
  readonly buttonPopupCreateNewTemplateAssignee: Locator
  readonly buttonPopupCreateNewTemplateLabels: Locator
  readonly buttonPopupCreateNewTemplateEstimation: Locator
  readonly buttonPopupCreateNewTemplateComponent: Locator
  readonly buttonPopupCreateNewTemplateMilestone: Locator
  readonly buttonSaveTemplate: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonNewTemplate = page.locator('button > span', { hasText: 'Template' })
    this.inputIssueTitle = page.locator('form[id$="NewProcess"] input')
    this.inputIssueDescription = page.locator('form[id$="NewProcess"] div.tiptap')
    this.buttonPopupCreateNewTemplatePriority = page.locator(
      'form[id$="NewProcess"] div.antiCard-pool > button:first-child'
    )
    this.buttonPopupCreateNewTemplateAssignee = page.locator('form[id$="NewProcess"] div.antiCard-pool > div > button')
    this.buttonPopupCreateNewTemplateLabels = page.locator(
      'form[id$="NewProcess"] div.antiCard-pool > button:nth-child(3)'
    )
    this.buttonPopupCreateNewTemplateEstimation = page.locator(
      'form[id$="NewProcess"] div.antiCard-pool > button:nth-child(4)'
    )
    this.buttonPopupCreateNewTemplateComponent = page.locator(
      'form[id$="NewProcess"] div.antiCard-pool > button:nth-child(5)'
    )
    this.buttonPopupCreateNewTemplateMilestone = page.locator(
      'form[id$="NewProcess"] div.antiCard-pool > button:nth-child(6)'
    )
    this.buttonSaveTemplate = page.locator('form[id$="NewProcess"] div[class*="footer"] button')
  }

  async createNewTemplate (data: NewIssue): Promise<void> {
    await this.buttonNewTemplate.click()

    await this.inputIssueTitle.fill(data.title)
    await this.inputIssueDescription.fill(data.description)
    if (data.priority != null) {
      await this.buttonPopupCreateNewTemplatePriority.click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonPopupCreateNewTemplateAssignee.click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      await this.buttonPopupCreateNewTemplateLabels.click()
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from templateNewIssue')
      }
      await this.checkFromDropdown(this.page, data.labels)
      // await this.inputIssueTitle.click({ force: true })
      await this.buttonPopupCreateNewTemplatePriority.click({ force: true })
    }
    if (data.estimation != null) {
      await this.buttonPopupCreateNewTemplateEstimation.click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.component != null) {
      await this.buttonPopupCreateNewTemplateComponent.click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.milestone != null) {
      await this.buttonPopupCreateNewTemplateMilestone.click()
      await this.selectMenuItem(this.page, data.milestone)
    }

    await this.buttonSaveTemplate.click()
  }

  async openTemplate (templateName: string): Promise<void> {
    await this.page.locator('span.issuePresenterRoot > span', { hasText: templateName }).click()
  }

  async checkTemplateNotExist (templateName: string): Promise<void> {
    await expect(this.page.locator('span.issuePresenterRoot > span').filter({ hasText: templateName })).toHaveCount(0)
  }
}
