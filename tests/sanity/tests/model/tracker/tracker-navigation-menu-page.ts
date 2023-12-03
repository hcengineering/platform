import { expect, type Locator, type Page } from '@playwright/test'

export class TrackerNavigationMenuPage {
  readonly page: Page
  readonly buttonIssues: Locator
  readonly buttonCreateProject: Locator
  readonly buttonProjectsParent: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonIssues = page.locator('a span', { hasText: 'Issues' })
    this.buttonCreateProject = page.locator('div#tree-projects').locator('xpath=..')
    this.buttonProjectsParent = page.locator('div.parent > span')
  }

  async pressCreateProjectButton (): Promise<void> {
    await this.buttonCreateProject.hover()
    await this.buttonCreateProject.locator('button.small').click()
  }

  async checkProjectExist (projectName: string): Promise<void> {
    await expect(this.buttonProjectsParent.filter({ hasText: projectName })).toHaveCount(1)
  }

  async checkProjectNotExist (projectName: string): Promise<void> {
    await expect(this.buttonProjectsParent.filter({ hasText: projectName })).toHaveCount(0)
  }

  async openProject (projectName: string): Promise<void> {
    await this.buttonProjectsParent.filter({ hasText: projectName }).click()
  }

  async openTemplateForProject (projectName: string): Promise<void> {
    await this.page.locator(`a[href$="templates"][href*="${projectName}"]`).click()
  }

  async openIssuesForProject (projectName: string): Promise<void> {
    await this.page.locator(`a[href$="issues"][href*="${projectName}"]`).click()
  }
}
