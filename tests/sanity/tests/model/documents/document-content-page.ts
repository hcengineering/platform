import { type Locator, type Page, expect } from '@playwright/test'
import { CommonPage } from '../common-page'

export class DocumentContentPage extends CommonPage {
  readonly page: Page
  readonly buttonDocumentTitle: Locator
  readonly inputContent: Locator
  readonly buttonToolbarLink: Locator
  readonly inputFormLink: Locator
  readonly buttonFormLinkSave: Locator
  readonly buttonMoreActions: Locator

  constructor (page: Page) {
    super()
    this.page = page
    this.buttonDocumentTitle = page.locator('div[class*="main-content"] div.title input')
    this.inputContent = page.locator('div.textInput div.tiptap')
    this.buttonToolbarLink = page.locator('div.text-editor-toolbar button:nth-child(10)')
    this.inputFormLink = page.locator('form[id="text-editor:string:Link"] input')
    this.buttonFormLinkSave = page.locator('form[id="text-editor:string:Link"] button[type="submit"]')
    this.buttonMoreActions = page.locator('div.popupPanel-title button#btn-doc-title-open-more')
  }

  async checkDocumentTitle (title: string): Promise<void> {
    await expect(this.buttonDocumentTitle).toHaveValue(title)
  }

  async addContentToTheNewLine (newContent: string): Promise<string> {
    await this.inputContent.pressSequentially(`\n${newContent}`)
    const endContent = await this.inputContent.textContent()
    if (endContent == null) {
      return ''
    } else {
      return endContent
    }
  }

  async checkContent (content: string): Promise<void> {
    await expect(this.inputContent).toHaveText(content)
  }

  async updateDocumentTitle (title: string): Promise<void> {
    await this.buttonDocumentTitle.fill(title)
  }

  async addRandomLines (count: number, lineLength: number = 36): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.addContentToTheNewLine(Math.random().toString(lineLength).substring(2, lineLength))
      await this.page.waitForTimeout(100)
    }
  }

  async addLinkToText (text: string, link: string): Promise<void> {
    await expect(this.page.locator('p', { hasText: text })).toBeVisible()
    await this.page.locator('p', { hasText: text }).click()
    await this.page.locator('p', { hasText: text }).dblclick()
    await this.buttonToolbarLink.click()

    await this.inputFormLink.fill(link)
    await this.buttonFormLinkSave.click()
  }

  async checkLinkInTheText (text: string, link: string): Promise<void> {
    await expect(this.page.locator('a', { hasText: text })).toHaveAttribute('href', link)
  }

  async executeMoreAction (action: string): Promise<void> {
    await this.buttonMoreActions.click()
    await this.selectFromDropdown(this.page, action)
  }
}
