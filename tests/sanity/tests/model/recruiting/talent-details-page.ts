import { expect, type Locator, type Page } from '@playwright/test'
import { CommonRecruitingPage } from './common-recruiting-page'

export class TalentDetailsPage extends CommonRecruitingPage {
  readonly page: Page
  readonly buttonAddSkill: Locator
  readonly textTagItem: Locator
  readonly buttonAddSocialLinks: Locator
  readonly buttonContactPhone: Locator
  readonly inputLocation: Locator
  readonly buttonInputTitle: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonAddSkill = page.locator('button#add-tag')
    this.textTagItem = page.locator('div.tag-item')
    this.buttonAddSocialLinks = page.locator('button[id="presentation:string:AddSocialLinks"]')
    this.buttonContactPhone = page.locator(
      'div[class^="popupPanel-body"] div.horizontal button[id="contact:string:Phone"]'
    )
    this.inputLocation = page.locator('div.location input')
    this.buttonInputTitle = page.locator('button > span', { hasText: 'Title' })
  }

  async addSkill (skillTag: string, skillDescription: string): Promise<void> {
    await this.buttonAddSkill.click()
    await this.pressCreateButtonSelectPopup(this.page)
    await this.addNewTagPopup(this.page, skillTag, skillDescription)

    await this.pressShowAllButtonSelectPopup(this.page)
    await this.checkFromDropdown(this.page, skillTag)

    await this.page.keyboard.press('Escape')
  }

  async checkSkill (skillTag: string): Promise<void> {
    await expect(await this.textTagItem).toContainText(skillTag)
  }

  async addSocialLinks (link: string, linkDescription: string): Promise<void> {
    await this.buttonAddSocialLinks.click()
    await this.selectFromDropdown(this.page, link)
    await this.fillToDropdown(this.page, linkDescription)
  }

  async checkSocialLinks (link: string): Promise<void> {
    switch (link) {
      case 'Phone':
        await expect(this.buttonContactPhone).toBeVisible()
        break
      default:
        throw new Error(`Unknown case ${link}`)
    }
  }

  async addTitle (title: string): Promise<void> {
    await this.buttonInputTitle.click()
    await this.fillToSelectPopup(this.page, title)
  }
}
