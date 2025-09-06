import { expect, type Locator, type Page } from '@playwright/test'
import { DocumentCommonPage } from './document-common-page'

export class DocumentReasonAndImpactPage extends DocumentCommonPage {
  readonly page: Page
  readonly buttonReasonAndImpactTabSelected: Locator
  readonly textAreaDescription: Locator
  readonly textAreaReason: Locator
  readonly textAreaImpactAnalysis: Locator
  readonly buttonImpactedDocuments: Locator
  readonly textDescription: Locator
  readonly textReason: Locator
  readonly textImpactAnalysis: Locator
  readonly textImpactedDocuments: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonReasonAndImpactTabSelected = page.locator('div.tab.selected', { hasText: 'Reason & Impact' })
    this.textAreaDescription = page.locator('div.box textarea.root').first()
    this.textAreaReason = page.locator('div.box textarea.root').nth(1)
    this.textAreaImpactAnalysis = page.locator('div.box textarea.root').last()
    this.buttonImpactedDocuments = page.locator('div.addButton')
    this.textDescription = page.locator('//div[contains(@class, "title") and text()="Description"]/..')
    this.textReason = page.locator('//div[contains(@class, "title") and text()="Reason"]/..')
    this.textImpactAnalysis = page.locator('//div[contains(@class, "title") and text()="Impact analysis"]/..')
    this.textImpactedDocuments = page.locator(
      '//div[contains(@class, "title") and text()="Impacted documents"]/..//div/span'
    )
  }

  async setReasonAndImpactData (
    description: string,
    reason: string,
    analysis: string,
    documentName: string
  ): Promise<void> {
    await this.textAreaDescription.clear()
    await this.textAreaDescription.fill(description)

    await this.textAreaReason.clear()
    await this.textAreaReason.fill(reason)

    await this.textAreaImpactAnalysis.focus()
    await this.textAreaImpactAnalysis.press('Meta+A')
    await this.textAreaImpactAnalysis.press('Backspace')
    await this.textAreaImpactAnalysis.fill(analysis)

    await this.buttonImpactedDocuments.click()
    await this.selectListItem(this.page, documentName)

    await this.buttonReasonAndImpactTabSelected.click({ force: true })
  }

  async checkReasonAndImpactData (
    description: string,
    reason: string,
    analysis: string,
    documentName: string
  ): Promise<void> {
    await expect(this.textDescription).toContainText(description)
    await expect(this.textReason).toContainText(reason)
    await expect(this.textImpactAnalysis).toContainText(analysis)
    await expect(this.textImpactedDocuments).toHaveText(documentName)
  }
}
