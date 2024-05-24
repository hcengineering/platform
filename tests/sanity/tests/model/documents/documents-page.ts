import { type Locator, type Page, expect } from '@playwright/test'
import { NewDocument, NewTeamspace } from './types'
import { CommonPage } from '../common-page'
import { DocumentCreatePopup } from './document-create-popup'
import { DocumentMovePopup } from './document-move-popup'

export class DocumentsPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
    this.popupCreateDocument = new DocumentCreatePopup(page)
    this.popupMoveDocument = new DocumentMovePopup(page)
  }

  readonly popupCreateDocument: DocumentCreatePopup
  readonly popupMoveDocument: DocumentMovePopup

  readonly buttonCreateDocument = (): Locator =>
    this.page.locator('div[data-float="navigator"] button[id="new-document"]')

  readonly divTeamspacesParent = (): Locator =>
    this.page.locator('div#navGroup-tree-teamspaces').locator('xpath=../button[1]')

  readonly buttonCreateTeamspace = (): Locator => this.page.locator('button#tree-teamspaces')
  readonly formNewTeamspace = (): Locator => this.page.locator('form[id="document:string:NewTeamspace"]')
  readonly formEditTeamspace = (): Locator => this.page.locator('form[id="document:string:EditTeamspace"]')
  readonly inputModalNewTeamspaceTitle = (): Locator =>
    this.formNewTeamspace().locator('div[id="teamspace-title"] input')

  readonly inputModalNewTeamspaceDescription = (): Locator =>
    this.formNewTeamspace().locator('div[id="teamspace-description"] input')

  readonly inputModalNewTeamspacePrivate = (): Locator => this.formNewTeamspace().locator('[id="teamspace-private"]')
  readonly buttonModalNewTeamspaceCreate = (): Locator => this.formNewTeamspace().locator('button[type="submit"]')
  readonly buttonModalEditTeamspaceTitle = (): Locator =>
    this.formEditTeamspace().locator('div[id="teamspace-title"] input')

  readonly buttonModalEditTeamspaceDescription = (): Locator =>
    this.formEditTeamspace().locator('div[id="teamspace-description"] input')

  readonly buttonModalEditTeamspacePrivate = (): Locator => this.formEditTeamspace().locator('[id="teamspace-private"]')

  readonly buttonModalEditTeamspaceSave = (): Locator => this.formEditTeamspace().locator('button[type="submit"]')
  readonly buttonModalEditTeamspaceClose = (): Locator => this.formEditTeamspace().locator('button#card-close')

  async clickOnButtonCreateDocument (): Promise<void> {
    await this.buttonCreateDocument().click()
  }

  async createNewTeamspace (data: NewTeamspace): Promise<void> {
    await this.divTeamspacesParent().hover()
    await this.buttonCreateTeamspace().click()
    await this.inputModalNewTeamspaceTitle().fill(data.title)
    if (data.description != null) {
      await this.inputModalNewTeamspaceDescription().fill(data.description)
    }
    if (data.private != null) {
      await this.inputModalNewTeamspacePrivate().click()
    }
    await this.buttonModalNewTeamspaceCreate().click()
  }

  async openTeamspace (name: string): Promise<void> {
    const classes = await this.page
      .locator('button.hulyNavGroup-header span[class*="label"]', { hasText: name })
      .locator('xpath=../..')
      .getAttribute('class')
    if (classes != null && !classes.includes('isOpen')) {
      await this.page.getByRole('button', { name }).click()
    }
  }

  async checkTeamspaceExist (name: string): Promise<void> {
    await expect(
      this.page.locator('div[class*="hulyNavGroup-content"] span[class*="label"]', { hasText: name })
    ).toHaveCount(1)
  }

  async checkTeamspaceNotExist (name: string): Promise<void> {
    await expect(
      this.page.locator('button[class*="hulyNavGroup-header"] span[class*="label"]', { hasText: name })
    ).toHaveCount(0)
  }

  async moreActionTeamspace (name: string, action: string): Promise<void> {
    await this.page.locator('button.hulyNavGroup-header span[class*="label"]', { hasText: name }).hover()
    await this.page
      .locator(`xpath=//span[text()="${name}"]/../../div[@class="hulyNavGroup-header__tools"]/button[last()]`)
      .click()
    await this.selectFromDropdown(this.page, action)
  }

  async createDocument (data: NewDocument): Promise<void> {
    await this.popupCreateDocument.createDocument(data)
  }

  async openDocument (name: string): Promise<void> {
    await this.page.locator('button.hulyNavItem-container > span[class*="label"]', { hasText: name }).click()
  }

  async openDocumentForTeamspace (spaceName: string, documentName: string): Promise<void> {
    await this.page
      .locator('button.hulyNavGroup-header span[class*="label"]', { hasText: spaceName })
      .locator('xpath=../../following-sibling::div[1]')
      .locator('button.hulyNavItem-container span[class*="label"]', { hasText: documentName })
      .click()
  }

  async editTeamspace (data: NewTeamspace): Promise<void> {
    await this.buttonModalEditTeamspaceTitle().fill(data.title)
    if (data.description != null) {
      await this.buttonModalEditTeamspaceDescription().fill(data.description)
    }
    if (data.private != null) {
      await this.buttonModalEditTeamspacePrivate().click()
    }
    await this.buttonModalEditTeamspaceSave().click()
  }

  async checkTeamspace (data: NewTeamspace): Promise<void> {
    await expect(this.buttonModalEditTeamspaceTitle()).toHaveValue(data.title)
    if (data.description != null) {
      await expect(this.buttonModalEditTeamspaceDescription()).toHaveValue(data.description)
    }
    await this.buttonModalEditTeamspaceClose().click()
  }

  async moreActionsOnDocument (documentName: string, action: string): Promise<void> {
    await this.page.locator('button.hulyNavItem-container span[class*="label"]', { hasText: documentName }).hover()
    await this.page
      .locator('button.hulyNavItem-container > span[class*="label"]', { hasText: documentName })
      .locator('xpath=..')
      .locator('div.hulyNavItem-actions > button:last-child')
      .click()
    await this.selectFromDropdown(this.page, action)
  }

  async fillMoveDocumentForm (newSpace: string): Promise<void> {
    await this.popupMoveDocument.moveToSpace(newSpace)
  }
}
