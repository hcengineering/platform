import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'
import { MergeContacts } from './types'

export class TalentDetailsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly buttonAddSkill: Locator
  readonly textTagItem: Locator
  readonly inputLocation: Locator
  readonly buttonInputTitle: Locator
  readonly buttonInputSource: Locator
  readonly buttonMergeContacts: Locator
  readonly buttonFinalContact: Locator
  readonly buttonMergeRow: Locator
  readonly buttonPopupMergeContacts: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonAddSkill = page.locator('button#add-tag')
    this.textTagItem = page.locator('div.tag-item')
    this.inputLocation = page.locator('div.location input')
    this.buttonInputTitle = page.locator('button > span', { hasText: 'Title' })
    this.buttonInputSource = page.locator('button > span', { hasText: 'Source' })
    this.buttonMergeContacts = page.locator('button[class*="menuItem"] span', { hasText: 'Merge contacts' })
    this.buttonFinalContact = page.locator('form[id="contact:string:MergePersons"] button', {
      hasText: 'Final contact'
    })
    this.buttonMergeRow = page.locator('form[id="contact:string:MergePersons"] div.box')
    this.buttonPopupMergeContacts = page.locator('form[id="contact:string:MergePersons"] button > span', {
      hasText: 'Merge contacts'
    })
    this.textAttachmentName = page.locator('div.name a')
  }

  async addSkill (skillTag: string, skillDescription: string): Promise<void> {
    await this.buttonAddSkill.click()
    await this.pressCreateButtonSelectPopup(this.page)
    await this.addNewTagPopup(this.page, skillTag, skillDescription)

    await this.pressShowAllButtonSelectPopup(this.page)

    await this.page.keyboard.press('Escape')
  }

  async checkSkill (skillTag: string): Promise<void> {
    await expect(this.textTagItem.first()).toContainText(skillTag)
  }

  async addTitle (title: string): Promise<void> {
    await this.buttonInputTitle.click()
    await this.fillToSelectPopup(this.page, title)
  }

  async addSource (source: string): Promise<void> {
    await this.buttonInputSource.click()
    await this.fillToSelectPopup(this.page, source)
  }

  async mergeContacts (talentName: MergeContacts): Promise<void> {
    await this.buttonMoreActions.click()
    await this.buttonMergeContacts.click()

    await this.buttonFinalContact.click()
    await this.selectMenuItem(this.page, talentName.finalContactName)

    await this.buttonMergeRow.locator('div.flex-center', { hasText: talentName.name }).locator('label.checkbox').click()

    if (talentName.mergeLocation) {
      await this.buttonMergeRow
        .locator('div.flex-center', { hasText: talentName.location })
        .locator('label.checkbox')
        .click()
    }
    if (talentName.mergeTitle) {
      await this.buttonMergeRow
        .locator('div.flex-center', { hasText: talentName.title })
        .locator('label.checkbox')
        .click()
    }
    if (talentName.mergeSource) {
      await this.buttonMergeRow
        .locator('div.flex-center', { hasText: talentName.source })
        .locator('label.checkbox')
        .click()
    }

    await this.buttonPopupMergeContacts.click()
  }

  async waitTalentDetailsOpened (applicationFirstName: string, applicationLastName?: string): Promise<void> {
    await this.page.waitForSelector(`div[class*="header"] div.name:first-child :has-text("${applicationFirstName}")`)
    if (applicationLastName != null) {
      await this.page.waitForSelector(`div[class*="header"] div.name:nth-child(2) :has-text("${applicationFirstName}")`)
    }
  }
}
