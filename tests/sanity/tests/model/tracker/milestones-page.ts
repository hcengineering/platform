import { expect, type Locator, type Page } from '@playwright/test'
import { NewMilestone } from './types'
import { CommonTrackerPage } from './common-tracker-page'

export class MilestonesPage extends CommonTrackerPage {
  readonly page: Page
  readonly modelSelectorAll: Locator
  readonly modelSelectorPlanned: Locator
  readonly modelSelectorActive: Locator
  readonly buttonCreateNewMilestone: Locator
  readonly inputNewMilestoneName: Locator
  readonly inputNewMilestoneDescription: Locator
  readonly buttonNewMilestoneSetStatus: Locator
  readonly buttonNewMilestoneTargetDate: Locator
  readonly buttonNewMilestoneCreate: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.modelSelectorAll = page.locator('div[data-id="tab-all"]')
    this.modelSelectorPlanned = page.locator('div[data-id="tab-planned"]')
    this.modelSelectorActive = page.locator('div[data-id="tab-active"]')
    this.buttonCreateNewMilestone = page.locator('div.ac-header-full button[type="submit"]')
    this.inputNewMilestoneName = page.locator(
      'form[id="tracker:string:NewMilestone"] input[placeholder="Milestone name"]'
    )
    this.inputNewMilestoneDescription = page.locator('form[id="tracker:string:NewMilestone"] div.tiptap')
    this.buttonNewMilestoneSetStatus = page.locator(
      'form[id="tracker:string:NewMilestone"] div.antiCard-pool button[type="button"]'
    )
    this.buttonNewMilestoneTargetDate = page.locator(
      'form[id="tracker:string:NewMilestone"] div.antiCard-pool button.datetime-button'
    )
    this.buttonNewMilestoneCreate = page.locator('form[id="tracker:string:NewMilestone"] button[type="submit"]')
  }

  async createNewMilestone (data: NewMilestone): Promise<void> {
    await this.buttonCreateNewMilestone.click()

    await this.inputNewMilestoneName.fill(data.name)
    if (data.description != null) {
      await this.inputNewMilestoneDescription.fill(data.description)
    }
    if (data.status != null) {
      await this.buttonNewMilestoneSetStatus.click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.targetDate != null) {
      await this.buttonNewMilestoneTargetDate.click()
      await this.fillDatePopup(data.targetDate.day, data.targetDate.month, data.targetDate.year)
    }
    if (data.targetDateInDays != null) {
      await this.buttonNewMilestoneTargetDate.click()
      await this.fillDatePopupInDays(data.targetDateInDays)
    }
    await this.buttonNewMilestoneCreate.click()
  }

  async openMilestoneByName (milestoneName: string): Promise<void> {
    await this.page.locator('div.listGrid a', { hasText: milestoneName }).click()
  }

  async checkMilestoneNotExist (milestoneName: string): Promise<void> {
    await expect(this.page.locator('div.listGrid a', { hasText: milestoneName })).toHaveCount(0)
  }
}
