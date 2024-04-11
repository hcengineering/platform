import { type Locator, type Page, expect } from '@playwright/test'
import { NewDocument, NewTeamspace } from './types'
import { CommonPage } from '../common-page'
import { DocumentCreatePopup } from './document-create-popup'
import { DocumentMovePopup } from './document-move-popup'

export class DocumentsPage extends CommonPage {
  readonly page: Page
  readonly buttonCreateDocument: Locator
  readonly divTeamspacesParent: Locator
  readonly buttonCreateTeamspace: Locator
  readonly inputModalNewTeamspaceTitle: Locator
  readonly inputModalNewTeamspaceDescription: Locator
  readonly inputModalNewTeamspacePrivate: Locator
  readonly buttonModalNewTeamspaceCreate: Locator
  readonly buttonModalEditTeamspaceTitle: Locator
  readonly buttonModalEditTeamspaceDescription: Locator
  readonly buttonModalEditTeamspacePrivate: Locator
  readonly buttonModalEditTeamspaceSave: Locator
  readonly buttonModalEditTeamspaceClose: Locator
  readonly popupCreateDocument: DocumentCreatePopup
  readonly popupMoveDocument: DocumentMovePopup

  constructor (page: Page) {
    super()
    this.page = page
    this.popupCreateDocument = new DocumentCreatePopup(page)
    this.popupMoveDocument = new DocumentMovePopup(page)

    const newForm = page.locator('form[id="document:string:NewTeamspace"]')
    const editForm = page.locator('form[id="document:string:EditTeamspace"]')

    this.buttonCreateDocument = page.locator('div[data-float="navigator"] button[id="new-document"]')
    this.divTeamspacesParent = page.locator('div#tree-teamspaces').locator('xpath=..')
    this.buttonCreateTeamspace = page.locator('div#tree-teamspaces > button')
    this.inputModalNewTeamspaceTitle = newForm.locator('div[id="teamspace-title"] input')
    this.inputModalNewTeamspaceDescription = newForm.locator('div[id="teamspace-description"] input')
    this.inputModalNewTeamspacePrivate = newForm.locator('div.antiGrid label.toggle')
    this.buttonModalNewTeamspaceCreate = newForm.locator('button[type="submit"]')

    this.buttonModalEditTeamspaceTitle = editForm.locator('div[id="teamspace-title"] input')
    this.buttonModalEditTeamspaceDescription = editForm.locator('div[id="teamspace-description"] input')
    this.buttonModalEditTeamspacePrivate = editForm.locator('div.antiGrid label.toggle')
    this.buttonModalEditTeamspaceSave = editForm.locator('button[type="submit"]')
    this.buttonModalEditTeamspaceClose = editForm.locator('button#card-close')
  }

  async createNewTeamspace (data: NewTeamspace): Promise<void> {
    await this.divTeamspacesParent.hover()
    await this.buttonCreateTeamspace.click()

    await this.inputModalNewTeamspaceTitle.fill(data.title)
    if (data.description != null) {
      await this.inputModalNewTeamspaceDescription.fill(data.description)
    }
    if (data.private != null) {
      await this.inputModalNewTeamspacePrivate.click()
    }

    await this.buttonModalNewTeamspaceCreate.click()
  }

  async openTeamspace (name: string): Promise<void> {
    const classes = await this.page
      .locator('div.antiNav-element span[class*="label"]', { hasText: name })
      .locator('xpath=..')
      .getAttribute('class')
    if (classes != null && classes.includes('collapsed')) {
      await this.page.locator('div.antiNav-element span[class*="label"]', { hasText: name }).click()
    }
  }

  async checkTeamspaceExist (name: string): Promise<void> {
    await expect(this.page.locator('div[class*="dropbox"] span[class*="label"]', { hasText: name })).toHaveCount(1)
  }

  async checkTeamspaceNotExist (name: string): Promise<void> {
    await expect(this.page.locator('div[class*="dropbox"] span[class*="label"]', { hasText: name })).toHaveCount(0)
  }

  async moreActionTeamspace (name: string, action: string): Promise<void> {
    await this.page.locator('div[class*="dropbox"] > div > span[class*="label"]', { hasText: name }).hover()
    await this.page.locator(`xpath=//span[text()="${name}"]/../div[last()]`).click()
    await this.selectFromDropdown(this.page, action)
  }

  async createDocument (data: NewDocument): Promise<void> {
    await this.popupCreateDocument.createDocument(data)
  }

  async openDocument (name: string): Promise<void> {
    await this.page.locator('div.tree > span[class*="label"]', { hasText: name }).click()
  }

  async openDocumentForTeamspace (spaceName: string, documentName: string): Promise<void> {
    await this.page
      .locator('div.parent > span[class*="label"]', { hasText: spaceName })
      .locator('xpath=../following-sibling::div[1]')
      .locator('div.tree > span[class*="label"]', { hasText: documentName })
      .click()
  }

  async editTeamspace (data: NewTeamspace): Promise<void> {
    await this.buttonModalEditTeamspaceTitle.fill(data.title)
    if (data.description != null) {
      await this.buttonModalEditTeamspaceDescription.fill(data.description)
    }
    if (data.private != null) {
      await this.buttonModalEditTeamspacePrivate.click()
    }

    await this.buttonModalEditTeamspaceSave.click()
  }

  async checkTeamspace (data: NewTeamspace): Promise<void> {
    await expect(this.buttonModalEditTeamspaceTitle).toHaveValue(data.title)
    if (data.description != null) {
      await expect(this.buttonModalEditTeamspaceDescription).toHaveValue(data.description)
    }
    await this.buttonModalEditTeamspaceClose.click()
  }

  async moreActionsOnDocument (documentName: string, action: string): Promise<void> {
    await this.page
      .locator('div.tree > span[class*="label"]', { hasText: documentName })
      .locator('xpath=..')
      .locator('div[class*="tool"]:nth-child(6)')
      .click()
    await this.selectFromDropdown(this.page, action)
  }

  async fillMoveDocumentForm (newSpace: string): Promise<void> {
    await this.popupMoveDocument.moveToSpace(newSpace)
  }
}
