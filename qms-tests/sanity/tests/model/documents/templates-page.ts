import { type Locator, type Page } from '@playwright/test'
import { CalendarPage } from '../calendar-page'
import { NewTemplate } from '../types'

export class TemplatesPage extends CalendarPage {
  readonly page: Page
  readonly buttonCreateTemplate: Locator
  readonly buttonSpaceSelector: Locator
  readonly buttonPopupNextStep: Locator
  readonly inputNewTemplateTitle: Locator
  readonly inputNewTemplateDescription: Locator
  readonly inputNewTemplateCreateDaft: Locator
  readonly buttonNewTemplateCategory: Locator
  readonly buttonNewTemplateCustomReason: Locator
  readonly inputNewTemplateCustomReason: Locator
  readonly sectionHighlightedTeam: Locator
  readonly inputNewTemplateCode: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.buttonCreateTemplate = page.getByRole('button', { name: 'Template', exact: true })
    this.buttonSpaceSelector = page.locator('button[id="space.selector"]')
    this.buttonPopupNextStep = page.locator('div.popup button[type="submit"]')
    this.inputNewTemplateTitle = page.locator('div[id="doc-title"] input')
    this.inputNewTemplateDescription = page.locator('div[id="doc-description"] input')
    this.inputNewTemplateCreateDaft = page.locator('div.footer div.footerButtons button[type="button"]')
    this.buttonNewTemplateCategory = page.locator('div.popup div.sectionContent button')
    this.buttonNewTemplateCustomReason = page.locator('div.radio div.antiRadio:last-child')
    this.inputNewTemplateCustomReason = page.locator('div.popup div[id="doc-reason"] input')
    this.sectionHighlightedTeam = page.locator('div.popup div.highlighted', { hasText: 'Team' })
    this.inputNewTemplateCode = page.locator('input[placeholder="DOC-1"]')
  }

  async createTemplate (data: NewTemplate): Promise<void> {
    if (data.location?.space != null) {
      await this.buttonSpaceSelector.click()
      await this.selectMenuItem(this.page, data.location.space)
    }

    if (data.location?.parent != null) {
      await this.page.locator('div.parentSelector span[class*="label"]', { hasText: data.location.parent }).click()
    }

    // title
    await this.buttonPopupNextStep.click()
    await this.inputNewTemplateTitle.fill(data.title)
    await this.inputNewTemplateDescription.fill(data.description)

    if (data.code != null) {
      await this.inputNewTemplateCode.fill(data.code)
    }

    if (data.category != null) {
      await this.buttonNewTemplateCategory.click()
      await this.selectListItemWithSearch(this.page, data.category, true)
    }

    if (data.reason != null) {
      await this.buttonNewTemplateCustomReason.click()
      await this.inputNewTemplateCustomReason.fill(data.reason)
    }

    // team
    await this.buttonPopupNextStep.click()
    if (data.reviewers != null) {
      await this.page.locator('div.addButton').nth(1).click()
      for (const reviewer of data.reviewers) {
        await this.selectListItemWithSearch(this.page, reviewer)
      }
      await this.sectionHighlightedTeam.click({ force: true })
    }

    if (data.approvers != null) {
      await this.page.locator('div.addButton').last().click()
      for (const approver of data.approvers) {
        await this.selectListItemWithSearch(this.page, approver)
      }
      await this.sectionHighlightedTeam.click({ force: true })
    }

    await this.inputNewTemplateCreateDaft.click()
  }
}
