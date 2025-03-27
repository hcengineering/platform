import { type Locator, type Page, expect } from '@playwright/test'
import { CommonPage } from '../common-page'
import { uploadFile } from '../../utils'
import path from 'path'

export class DocumentContentPage extends CommonPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly buttonDocumentTitle = (): Locator => this.page.locator('div[class*="main-content"] div.title input')
  readonly inputContent = (): Locator => this.page.locator('div.textInput div.tiptap')
  readonly selectContent = (): Locator => this.page.locator('div.textInput .select-text')
  readonly inputContentParapraph = (): Locator => this.page.locator('div.textInput div.tiptap > p')
  readonly leftMenu = (): Locator => this.page.locator('div.tiptap-left-menu')
  readonly proseTableCell = (row: number, col: number): Locator =>
    this.page.locator('table.proseTable').locator('tr').nth(row).locator('td').nth(col).locator('p')

  readonly firstImageInDocument = (): Locator => this.page.locator('.textInput .text-editor-image-container img')
  readonly tooltipImageTools = (): Locator => this.page.locator('.tippy-box')

  readonly fullscreenImage = (): Locator => this.page.locator('.popup.fullsize img')
  readonly fullscreenButton = (): Locator => this.page.locator('.popup #btnDialogFullScreen')
  readonly imageInPopup = (): Locator => this.page.locator('.popup img')

  readonly proseTableColumnHandle = (col: number): Locator =>
    this.page.locator('table.proseTable').locator('tr').first().locator('td').nth(col).locator('div.table-col-handle')

  readonly buttonInsertColumn = (col: number = 0): Locator =>
    this.page.locator('div.table-col-insert').nth(col).locator('button')

  readonly buttonInsertLastRow = (): Locator => this.page.locator('div.table-button-container__row')

  readonly buttonInsertInnerRow = (row: number = 0): Locator =>
    this.page.locator('table.proseTable').locator('tr').nth(row).locator('div.table-row-insert button')

  readonly buttonOnToolbar = (id: string): Locator =>
    this.page.locator(`div.text-editor-toolbar button[data-id="${id}"]`)

  readonly inputFormLink = (): Locator => this.page.locator('form[id="text-editor:string:Link"] input')
  readonly buttonFormLinkSave = (): Locator =>
    this.page.locator('form[id="text-editor:string:Link"] button[type="submit"]')

  readonly buttonMoreActions = (): Locator =>
    this.page.locator('div.hulyHeader-buttonsGroup button#btn-doc-title-open-more')

  readonly buttonLockedInTitle = (): Locator => this.page.getByRole('button', { name: 'Locked' })

  readonly popupPanel = (): Locator => this.page.locator('div.popupPanel-title')
  readonly popupPanelH1 = (): Locator => this.page.locator('div.antiPopup > h1')

  readonly rowToDo = (hasText: string): Locator => this.page.locator('div.tiptap div.todo-item', { hasText })
  readonly assigneeToDo = (hasText: string): Locator => this.rowToDo(hasText).locator('div.assignee')
  readonly checkboxToDo = (hasText: string): Locator => this.rowToDo(hasText).locator('input.chBox')

  readonly tocItems = (): Locator => this.page.locator('.toc-container .toc-item')
  readonly buttonTocPopupHeader = (headerText: string): Locator =>
    this.page.locator(`.popup button:has-text("${headerText}")`)

  readonly headerElementInDocument = (headerType: 'h1' | 'h2' | 'h3' = 'h1', text: string): Locator =>
    this.page.locator(`.textInput ${headerType}:has-text("${text}")`)

  readonly slashActionItemsPopup = (): Locator => this.page.locator('.selectPopup')

  readonly codeBlock = (hasText: string): Locator => this.page.locator('pre.proseCodeBlock > code', { hasText })
  readonly inputFormNote = (): Locator => this.page.locator('form[id="text-editor:string:ConfigureNote"] textarea')
  readonly colorFormNote = (color: string): Locator =>
    this.page.locator(`form[id="text-editor:string:ConfigureNote"] div.colorBox.${color}`)

  readonly setFormNote = (): Locator =>
    this.page.locator('form[id="text-editor:string:ConfigureNote"] div.antiCard-footer button[type="submit"]')

  readonly inputImageFile = (): Locator => this.page.locator('input[id="imageInput"]')
  readonly imageInContent = (): Locator => this.page.locator('p img[data-type="image"]')
  readonly noteInContent = (hasText: string): Locator => this.page.locator('p span[data-mark="note"]', { hasText })

  async checkDocumentTitle (title: string): Promise<void> {
    await expect(this.buttonDocumentTitle()).toHaveValue(title)
  }

  async checkDocumentLocked (): Promise<void> {
    await expect(this.buttonLockedInTitle()).toBeVisible({ timeout: 1000 })
  }

  async addContentToTheNewLine (newContent: string, newLine: boolean = true): Promise<string> {
    await expect(this.inputContent()).toBeVisible()
    await expect(this.inputContent()).toHaveJSProperty('contentEditable', 'true')
    await this.inputContent().pressSequentially(`${newLine ? '\n' : ''}${newContent}`)
    const endContent = await this.inputContent().textContent()
    return endContent ?? ''
  }

  async checkContent (content: string): Promise<void> {
    await expect(this.inputContent()).toHaveText(content)
  }

  async checkUserAddedImage (): Promise<void> {
    await expect(this.firstImageInDocument()).toBeVisible()
  }

  async checkIfImageToolsIsVisible (): Promise<void> {
    await expect(this.tooltipImageTools()).toBeVisible()
  }

  async clickImageToolsButton (dataId: string): Promise<void> {
    await this.tooltipImageTools().locator(`[data-id$="${dataId}"]`).click()
  }

  async selectedFirstImageInDocument (): Promise<void> {
    await this.firstImageInDocument().click()
  }

  async checkIfImageHasAttribute (attribute: string, value: string): Promise<void> {
    await expect(this.firstImageInDocument()).toHaveAttribute(attribute, value)
  }

  async clickImageAlignButton (align: 'left' | 'center' | 'right'): Promise<void> {
    await this.selectedFirstImageInDocument()
    await this.checkIfImageToolsIsVisible()

    switch (align) {
      case 'left':
        await this.clickImageToolsButton('btnAlignLeft')
        break
      case 'right':
        await this.clickImageToolsButton('btnAlignRight')
        break
      case 'center':
        await this.clickImageToolsButton('btnAlignCenter')
        break
    }
  }

  async clickImageSizeButton (size: string | number): Promise<void> {
    await this.selectedFirstImageInDocument()
    await this.checkIfImageToolsIsVisible()
    await this.clickImageToolsButton('btnMoreActions')
    await this.page.locator(`.popup button:has-text("${size}")`).click()
  }

  async clickImageFullscreenButton (): Promise<void> {
    await this.selectedFirstImageInDocument()
    await this.checkIfImageToolsIsVisible()
    await this.clickImageToolsButton('btnViewImage')
  }

  async clickImageOriginalButton (): Promise<void> {
    await this.selectedFirstImageInDocument()
    await this.checkIfImageToolsIsVisible()
    await this.clickImageToolsButton('btnViewOriginal')
  }

  async checkImageAlign (side: 'left' | 'right' | 'center' = 'left'): Promise<void> {
    const imageBox = await this.firstImageInDocument().boundingBox()
    const parentBox = await this.selectContent().boundingBox()

    if (!(imageBox !== null && parentBox !== null)) {
      throw new Error('Image or parent box is not found')
    }

    const elementLeftEdge = imageBox.x
    const parentLeftEdge = parentBox.x
    const elementRightEdge = imageBox.x + imageBox.width
    const parentRightEdge = parentBox.x + parentBox.width

    switch (side) {
      case 'right':
        expect(elementRightEdge).toEqual(parentRightEdge)
        break
      case 'left':
        expect(elementLeftEdge).toEqual(parentLeftEdge)
        break
      case 'center':
        expect(elementLeftEdge - parentLeftEdge).toBeGreaterThan(0)
        expect(elementLeftEdge - parentLeftEdge).toEqual(parentRightEdge - elementRightEdge)
        break
    }
  }

  async checkImageSize (size: '25%' | '50%' | '100%' | number): Promise<void> {
    const imageBox = await this.firstImageInDocument().boundingBox()
    const parentBox = await this.selectContent().boundingBox()

    if (!(imageBox !== null && parentBox !== null)) {
      throw new Error('Image or parent box is not found')
    }

    switch (size) {
      case '25%':
        expect(imageBox.width).toEqual(parentBox.width / 4)
        break
      case '50%':
        expect(imageBox.width).toEqual(parentBox.width / 2)
        break
      case '100%':
        expect(imageBox.width).toEqual(parentBox.width)
        break
      default:
        expect(imageBox.width).toEqual(size)
        break
    }
  }

  async updateDocumentTitle (title: string): Promise<void> {
    await this.buttonDocumentTitle().fill(title)
    await this.buttonDocumentTitle().blur()
  }

  async addRandomLines (count: number, lineLength: number = 36): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.addContentToTheNewLine(Math.random().toString(lineLength).substring(2, lineLength))
      await this.page.waitForTimeout(100)
    }
  }

  async addLinkToText (text: string, link: string): Promise<void> {
    await expect(this.page.locator('p', { hasText: text })).toBeVisible()
    await this.page.locator('p', { hasText: text }).click({ clickCount: 3 })
    await this.buttonOnToolbar('btnLink').click()

    await this.inputFormLink().fill(link)
    await this.buttonFormLinkSave().click()
  }

  async clickButtonOnTooltip (id: string): Promise<void> {
    await this.buttonOnToolbar(id).click()
  }

  async selectLine (text: string): Promise<void> {
    const loc: Locator = this.page.locator('p', { hasText: text }).first()
    await expect(loc).toBeVisible()
    await loc.click({ clickCount: 3 })
  }

  async applyToolbarCommand (text: string, btnId: string): Promise<void> {
    await this.selectLine(text)
    await this.clickButtonOnTooltip(btnId)
  }

  async addSeparator (text: string): Promise<void> {
    await this.selectLine(text)
    await this.clickLeftMenu()
    await this.clickPopupItem('Separator line')
  }

  async goToByTOC (text: string): Promise<void> {
    await this.tocItems().first().click()
    await this.clickPopupItem(text)
  }

  async clickLeftMenu (): Promise<void> {
    await this.leftMenu().click()
  }

  async changeCodeBlockLanguage (text: string, oldLang: string, lang: string): Promise<void> {
    await this.codeBlock(text).locator('button.antiButton', { hasText: oldLang }).nth(1).click()
    await this.selectMenuItem(this.page, lang, true)
  }

  async applyNote (text: string, color: string, note: string): Promise<void> {
    await this.applyToolbarCommand(text, 'btnNote')
    await this.inputFormNote().fill(note)
    await this.colorFormNote(color).click()
    await this.setFormNote().click()
  }

  async checkNote (text: string, color: string, note: string): Promise<void> {
    await expect(this.noteInContent(text)).toBeVisible()
    await expect(this.noteInContent(text)).toHaveAttribute('data-kind', color)
    await expect(this.noteInContent(text)).toHaveAttribute('title', note)
  }

  async addImage (text: string): Promise<void> {
    await this.selectLine(text)
    await this.inputImageFile().setInputFiles(path.join(__dirname, '../../files/cat.jpeg'))
  }

  async checkImage (width: number = 215): Promise<void> {
    await expect(this.imageInContent()).toHaveAttribute('width', width.toString())
  }

  async checkLinkInTheText (text: string, link: string): Promise<void> {
    await expect(this.page.locator('a', { hasText: text })).toHaveAttribute('href', link)
  }

  async checkReferenceInTheText (label: string): Promise<void> {
    await expect(this.page.locator('span.antiMention', { hasText: label })).toHaveAttribute('data-type', 'reference')
  }

  async executeMoreAction (action: string): Promise<void> {
    await this.buttonMoreActions().click()
    await this.selectFromDropdown(this.page, action)
  }

  async checkIfPopupHasText (text: string): Promise<void> {
    await expect(this.popupPanelH1()).toHaveText(text)
  }

  async assignToDo (user: string, text: string): Promise<void> {
    await this.rowToDo(text).hover()
    await this.assigneeToDo(text).click()
    await this.selectListItem(user)
  }

  async checkToDo (text: string, checked: boolean): Promise<void> {
    await this.rowToDo(text).hover()
    await expect(this.checkboxToDo(text)).toBeChecked({ checked, timeout: 5000 })
  }

  async addImageToDocument (page: Page): Promise<void> {
    await this.inputContentParapraph().click()
    await this.leftMenu().click()
    await uploadFile(page, 'cat3.jpeg', 'Image')
    await this.checkUserAddedImage()
  }
}
