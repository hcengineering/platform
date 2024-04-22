import { expect, type Locator, type Page } from '@playwright/test'
import { CommonPage } from '../common-page'

export class TrackerNavigationMenuPage extends CommonPage {
  page: Page

  constructor (page: Page) {
    super()
    this.page = page
  }

  buttonCreateProject = (): Locator => this.page.locator('div#tree-projects').locator('xpath=..')
  buttonProjectsParent = (): Locator => this.page.locator('div.parent > span')
  templateLinkForProject = (projectName: string): Locator =>
    this.page.locator(`a[href$="templates"][href*="${projectName}"]`)

  issuesLinkForProject = (projectName: string): Locator =>
    this.page.locator(
      `xpath=//div[contains(@class, "parent")]/span[text()="${projectName}"]/../following-sibling::div[1]/a[contains(@href, "issues")]`,
      { hasText: 'Issues' }
    )

  milestonesLinkForProject = (projectName: string): Locator =>
    this.page.locator(`div[class*="antiNav-element"] a[href$="milestones"][href*="${projectName}"]> div > span`, {
      hasText: 'Milestones'
    })

  componentsLinkForProject = (projectName: string): Locator =>
    this.page.locator(`div[class*="antiNav-element"] a[href$="components"][href*="${projectName}"]> div > span`, {
      hasText: 'Components'
    })

  createProjectButton = (): Locator => this.buttonCreateProject().locator('button.small')

  async pressCreateProjectButton (): Promise<void> {
    await this.buttonCreateProject().hover()
    await this.createProjectButton().click()
  }

  async checkProjectExist (projectName: string): Promise<void> {
    await expect(this.buttonProjectsParent().filter({ hasText: projectName })).toHaveCount(1)
  }

  async checkProjectNotExist (projectName: string): Promise<void> {
    await expect(this.buttonProjectsParent().filter({ hasText: projectName })).toHaveCount(0)
  }

  async openProject (projectName: string): Promise<void> {
    await this.buttonProjectsParent().filter({ hasText: projectName }).click()
  }

  async openTemplateForProject (projectName: string): Promise<void> {
    await this.templateLinkForProject(projectName).click()
  }

  async openIssuesForProject (projectName: string): Promise<void> {
    await this.issuesLinkForProject(projectName).click()
  }

  async makeActionWithProject (projectName: string, action: string): Promise<void> {
    await this.buttonProjectsParent().filter({ hasText: projectName }).hover()
    await this.buttonProjectsParent()
      .filter({ hasText: projectName })
      .locator('xpath=..')
      .locator('div[class*="tool"]:not([class*="arrow"])')
      .click()
    await this.selectFromDropdown(this.page, action)
  }

  async openMilestonesForProject (projectName: string): Promise<void> {
    await this.milestonesLinkForProject(projectName).click()
  }

  async openComponentsForProject (projectName: string): Promise<void> {
    await this.componentsLinkForProject(projectName).click()
  }
}
