import { type Locator, type Page, expect } from '@playwright/test'

export class CommonPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  selectPopupInput = (): Locator => this.page.locator('div.selectPopup input')
  selectPopupInputSearch = (): Locator => this.page.locator('div.popup input.search')
  selectPopupListItem = (name: string): Locator => this.page.locator('div.selectPopup div.list-item', { hasText: name })
  selectPopupListItemFirst = (): Locator => this.page.locator('div.selectPopup div.list-item')
  selectPopupHeaderButtonLast = (): Locator => this.page.locator('div.selectPopup div.header button:last-child')
  selectPopupButton = (): Locator => this.page.locator('div.selectPopup button')
  selectPopupHeaderButtonFirst = (): Locator => this.page.locator('div.selectPopup div.header button:nth-of-type(1)')
  popupSpanLabel = (point: string): Locator =>
    this.page.locator('div[class$="opup"] span[class*="label"]', { hasText: point })

  selectPopupSpanLines = (item: string): Locator =>
    this.page.locator('div.selectPopup span[class^="lines"]', { hasText: item })

  popupButtonChannelOk = (): Locator => this.page.locator('div.popup button#channel-ok')
  viewStringDeleteObjectButtonPrimary = (): Locator =>
    this.page.locator('form[id="view:string:DeleteObject"] button.primary')

  tagsStringAddTagForm = (field: string): Locator =>
    this.page.locator(`div.popup form[id="tags:string:AddTag"] input[placeholder$="${field}"]`)

  tagsStringAddTagButtonSubmit = (): Locator =>
    this.page.locator('div.popup form[id="tags:string:AddTag"] button[type="submit"]')

  notifyContainerButton = (): Locator => this.page.locator('div.notify-container button[type="button"].small').nth(0)
  errorSpan = (): Locator => this.page.locator('div.ERROR span')
  infoSpan = (): Locator => this.page.locator('div.INFO span')
  popupSubmitButton = (): Locator => this.page.locator('div.popup button[type="submit"]')
  historyBoxButtonFirst = (): Locator => this.page.locator('div.history-box button:first-child')
  inboxNotyButton = (): Locator => this.page.locator('button[id$="Inbox"] > div.noty')
  mentionPopupListItem = (mentionName: string): Locator =>
    this.page.locator('form.mentionPoup div.list-item span.name', { hasText: mentionName })

  hulyPopupRowButton = (name: string): Locator =>
    this.page.locator('div.hulyPopup-container button.hulyPopup-row', { hasText: name })

  cardCloseButton = (): Locator => this.page.locator('div.popup button[id="card-close"]')
  menuPopupItemButton = (itemText: string): Locator =>
    this.page.locator('div.selectPopup button.menu-item', { hasText: itemText })

  async selectMenuItem (page: Page, name: string, fullWordFilter: boolean = false): Promise<void> {
    if (name !== 'first') {
      const filterText = fullWordFilter ? name : name.split(' ')[0]
      await this.selectPopupInput().fill(filterText)
      // TODO need to remove after fixed UBERF-4968
      await page.waitForTimeout(300)
    }
    await this.selectPopupListItemFirst().first().click()
  }

  async pressCreateButtonSelectPopup (page: Page): Promise<void> {
    await this.selectPopupHeaderButtonLast().click()
  }

  async pressShowAllButtonSelectPopup (page: Page): Promise<void> {
    await this.selectPopupHeaderButtonFirst().click()
  }

  async selectFromDropdown (page: Page, point: string): Promise<void> {
    await this.popupSpanLabel(point).click()
  }

  async checkDropdownHasNo (page: Page, item: string): Promise<void> {
    await expect(this.selectPopupSpanLines(item)).not.toBeVisible()
  }

  async fillToDropdown (page: Page, input: string): Promise<void> {
    await this.selectPopupInputSearch().fill(input)
    await this.popupButtonChannelOk().click()
  }

  async fillToSelectPopup (page: Page, input: string): Promise<void> {
    await expect(this.selectPopupInput()).toBeVisible()
    await this.selectPopupInput().fill(input)
    await this.selectPopupButton().click()
  }

  async checkFromDropdown (page: Page, point: string): Promise<void> {
    await this.selectPopupSpanLines(point).first().click()
  }

  async pressYesDeletePopup (page: Page): Promise<void> {
    await this.viewStringDeleteObjectButtonPrimary().click()
  }

  async addNewTagPopup (page: Page, title: string, description: string): Promise<void> {
    await this.tagsStringAddTagForm('title').fill(title)
    await this.tagsStringAddTagForm('Please type description here').fill(description)
    await this.tagsStringAddTagButtonSubmit().click()
    await this.tagsStringAddTagButtonSubmit().waitFor({ state: 'hidden' })
  }

  async selectAssignee (page: Page, name: string): Promise<void> {
    if (name !== 'first') {
      await this.selectPopupInput().fill(name.split(' ')[0])
      await expect(this.selectPopupListItemFirst()).toHaveCount(1)
    }
    await this.selectPopupListItemFirst().first().click()
  }

  async checkExistNewNotification (): Promise<void> {
    await expect(this.inboxNotyButton()).toBeVisible()
  }

  async pressYesForPopup (page: Page): Promise<void> {
    await expect(this.popupSubmitButton()).toBeVisible()
    await this.popupSubmitButton().click()
  }

  async pressButtonBack (page: Page): Promise<void> {
    await this.historyBoxButtonFirst().click()
  }

  async checkFromDropdownWithSearch (page: Page, point: string): Promise<void> {
    await this.selectPopupInput().fill(point)
    await this.selectPopupSpanLines(point).click()
  }

  async closeNotification (page: Page): Promise<void> {
    await this.notifyContainerButton().click()
  }

  async checkError (page: Page, errorMessage: string): Promise<void> {
    await expect(this.errorSpan()).toHaveText(errorMessage)
  }

  async checkInfo (page: Page, errorMessage: string): Promise<void> {
    await expect(this.infoSpan()).toHaveText(errorMessage)
  }

  async checkInfoSectionNotExist (page: Page): Promise<void> {
    await expect(this.infoSpan()).not.toBeAttached()
  }

  async selectMention (mentionName: string): Promise<void> {
    await this.mentionPopupListItem(mentionName).click()
  }

  async selectListItem (name: string): Promise<void> {
    await this.selectPopupListItem(name).click({ delay: 100 })
  }

  async selectPopupItem (name: string): Promise<void> {
    await this.hulyPopupRowButton(name).click({ delay: 100 })
  }

  async closePopup (): Promise<void> {
    await this.cardCloseButton().click()
  }

  async checkPopupItem (itemText: string): Promise<void> {
    await expect(this.menuPopupItemButton(itemText)).toBeVisible()
  }
}
