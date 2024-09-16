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

  readonly buttonDocumentWrapper = (name: string): Locator =>
    this.page.locator(`button.hulyNavItem-container:has-text("${name}")`)

  readonly buttonDocument = (name: string): Locator => this.buttonDocumentWrapper(name).locator('span[class*="label"]')

  readonly buttonAddDocumentToDocument = (name: string): Locator =>
    this.buttonDocumentWrapper(name).getByTestId('document:string:CreateDocument')

  readonly breadcrumbsByDocumentParent = (parentDocumentTitle: string): Locator =>
    this.page.locator(`.hulyHeader-titleGroup:has-text("${parentDocumentTitle}")`)

  readonly buttonDocumentsApp = (): Locator => this.page.locator('button[id$="document:string:DocumentApplication"]')
  readonly divTeamspacesParent = (): Locator =>
    this.page.locator('button.hulyNavGroup-header', { hasText: 'Teamspaces' })

  readonly buttonTeamspaces = (): Locator =>
    this.page.locator('button.hulyNavItem-container', { hasText: 'Teamspaces' })

  readonly rowTeamspace = (hasText: string): Locator =>
    this.page.locator('div.hulyComponent td ', { hasText }).locator('xpath=..')

  readonly buttonJoinTeamspace = (hasText: string): Locator =>
    this.page.locator('div.hulyComponent td ', { hasText }).locator('xpath=..').locator('button[type="submit"]')

  readonly buttonCreateTeamspace = (): Locator => this.page.locator('button#tree-teamspaces')
  readonly formNewTeamspace = (): Locator => this.page.locator('form[id="document:string:NewTeamspace"]')
  readonly formEditTeamspace = (): Locator => this.page.locator('form[id="document:string:EditTeamspace"]')
  readonly inputModalNewTeamspaceTitle = (): Locator =>
    this.formNewTeamspace().locator('div[id="teamspace-title"] input')

  readonly inputModalNewTeamspaceDescription = (): Locator =>
    this.formNewTeamspace().locator('div[id="teamspace-description"] input')

  readonly inputModalNewTeamspacePrivate = (): Locator => this.formNewTeamspace().locator('[id="teamspace-private"]')
  readonly inputModalNewTeamspaceAutoJoin = (): Locator => this.formNewTeamspace().locator('[id="teamspace-autoJoin"]')
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
    if (data?.description !== undefined) {
      await this.inputModalNewTeamspaceDescription().fill(data.description)
    }
    if (data.private === true) {
      await this.inputModalNewTeamspacePrivate().click()
    }
    if (data.autoJoin === true) {
      await this.inputModalNewTeamspaceAutoJoin().click()
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
    await this.buttonDocument(name).click()
  }

  async selectMoreActionOfDocument (name: string, popupItem: string): Promise<void> {
    await this.buttonDocument(name).hover()
    await this.page.getByRole('button', { name }).getByRole('button').nth(2).click()
    await this.selectFromDropdown(this.page, popupItem)
  }

  async clickAddDocumentIntoDocument (documentTitle: string): Promise<void> {
    await this.buttonDocumentWrapper(documentTitle).hover()
    await this.buttonAddDocumentToDocument(documentTitle).click()
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

  async clickDocumentsApp (): Promise<void> {
    await this.buttonDocumentsApp().click()
  }

  async clickTeamspaces (): Promise<void> {
    await this.buttonTeamspaces().click()
  }

  async joinTeamspace (name: string): Promise<void> {
    await expect(this.rowTeamspace(name)).toBeVisible()
    await this.buttonJoinTeamspace(name).click()
  }
}
