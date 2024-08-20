import { expect, type Locator } from '@playwright/test'
import { CommonTrackerPage } from './common-tracker-page'
import { NewIssue } from './types'

export class TemplatePage extends CommonTrackerPage {
  buttonNewTemplate = (): Locator => this.page.getByRole('button', { name: 'Template', exact: true })
  inputIssueTitle = (): Locator => this.page.locator('form[id$="NewProcess"] input[type="text"]')
  inputIssueDescription = (): Locator => this.page.locator('form[id$="NewProcess"] div.tiptap')
  buttonPopupCreateNewTemplatePriority = (): Locator =>
    this.page.locator('form[id$="NewProcess"] div.antiCard-pool > button:first-child')

  buttonPopupCreateNewTemplateAssignee = (): Locator =>
    this.page.locator('form[id$="NewProcess"] div.antiCard-pool > div > button')

  buttonPopupCreateNewTemplateLabels = (): Locator =>
    this.page.locator('form[id$="NewProcess"] div.antiCard-pool > button:nth-child(3)')

  buttonPopupCreateNewTemplateEstimation = (): Locator =>
    this.page.locator('form[id$="NewProcess"] div.antiCard-pool > button:nth-child(4)')

  buttonPopupCreateNewTemplateComponent = (): Locator =>
    this.page.locator('form[id$="NewProcess"] div.antiCard-pool > button:nth-child(5)')

  buttonPopupCreateNewTemplateMilestone = (): Locator =>
    this.page.locator('form[id$="NewProcess"] div.antiCard-pool > button:nth-child(6)')

  buttonSaveTemplate = (): Locator => this.page.locator('form[id$="NewProcess"] div[class*="footer"] button')
  directTemplateLocator = (templateName: string): Locator =>
    this.page.locator('span.issuePresenterRoot > span', { hasText: templateName })

  filteredTemplateLocator = (templateName: string): Locator =>
    this.page.locator('span.issuePresenterRoot > span').filter({ hasText: templateName })

  profileButton = (): Locator => this.page.locator('#profile-button')
  settingsButton = (): Locator => this.page.locator('button:has-text("Settings")')
  notificationsButton = (): Locator => this.page.getByRole('button', { name: 'Notifications' })
  textTemplatesLink = (): Locator => this.page.locator('text="Text Templates"')
  createTemplateButton = (): Locator => this.page.locator('#create-template')
  newTemplateInput = (): Locator => this.page.locator('[placeholder="New\\ template"]')
  proseMirrorEditor = (): Locator => this.page.locator('.ProseMirror')
  saveTemplateButton = (): Locator => this.page.locator('text=Save template')
  editTemplateButton = (): Locator => this.page.locator('text=Edit template')
  newSpaceTypeButton = (): Locator => this.page.locator('#new-space-type')

  async createNewTemplate (data: NewIssue): Promise<void> {
    await this.buttonNewTemplate().click()

    await this.inputIssueTitle().fill(data.title)
    await this.inputIssueDescription().fill(data.description)
    if (data.priority != null) {
      await this.buttonPopupCreateNewTemplatePriority().click()
      await this.selectMenuItem(this.page, data.priority)
    }
    if (data.assignee != null) {
      await this.buttonPopupCreateNewTemplateAssignee().click()
      await this.selectAssignee(this.page, data.assignee)
    }
    if (data.labels != null && data.createLabel != null) {
      await this.buttonPopupCreateNewTemplateLabels().click()
      if (data.createLabel) {
        await this.pressCreateButtonSelectPopup(this.page)
        await this.addNewTagPopup(this.page, data.labels, 'Tag from templateNewIssue')
      }
      await this.checkFromDropdown(this.page, data.labels)
      // await this.inputIssueTitle.click({ force: true })
      await this.buttonPopupCreateNewTemplatePriority().click({ force: true })
    }
    if (data.estimation != null) {
      await this.buttonPopupCreateNewTemplateEstimation().click()
      await this.fillToSelectPopup(this.page, data.estimation)
    }
    if (data.component != null) {
      await this.buttonPopupCreateNewTemplateComponent().click()
      await this.selectMenuItem(this.page, data.component)
    }
    if (data.milestone != null) {
      await this.buttonPopupCreateNewTemplateMilestone().click()
      await this.selectMenuItem(this.page, data.milestone)
    }

    await this.buttonSaveTemplate().click()
  }

  async openTemplate (templateName: string): Promise<void> {
    await this.directTemplateLocator(templateName).click()
  }

  async checkTemplateNotExist (templateName: string): Promise<void> {
    await expect(this.filteredTemplateLocator(templateName)).toHaveCount(0)
  }

  async navigateToWorkspace (workspaceUrl: string): Promise<void> {
    const response = await this.page.goto(workspaceUrl)
    if (response === null || response === undefined) {
      throw new Error(`Failed to navigate to ${workspaceUrl}`)
    }
    await response.finished()
  }

  async openProfileMenu (): Promise<void> {
    await this.profileButton().click()
  }

  async openSettings (): Promise<void> {
    await this.settingsButton().click()
  }

  async goToNotifications (): Promise<void> {
    await this.notificationsButton().click()
  }

  async selectTextTemplates (): Promise<void> {
    await this.textTemplatesLink().click()
  }

  async selectVacancies (): Promise<void> {
    await this.newSpaceTypeButton().click()
  }

  async createTemplate (templateName: string, templateContent: string): Promise<void> {
    await this.createTemplateButton().click()
    await this.newTemplateInput().fill(templateName)
    await this.proseMirrorEditor().fill(templateContent)
    await this.proseMirrorEditor().press('Enter')
    await this.proseMirrorEditor().fill('some more value')
    await this.saveTemplateButton().click()
  }

  async editTemplate (newContent: string): Promise<void> {
    await this.editTemplateButton().click()
    await this.proseMirrorEditor().fill(newContent)
    await this.saveTemplateButton().click()
  }
}
