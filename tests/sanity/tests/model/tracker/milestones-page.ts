import { expect, type Locator } from '@playwright/test'
import { NewMilestone } from './types'
import { CommonTrackerPage } from './common-tracker-page'

export class MilestonesPage extends CommonTrackerPage {
  modelSelectorAll = (): Locator => this.page.locator('label[data-id="tab-all"]')
  modelSelectorPlanned = (): Locator => this.page.locator('label[data-id="tab-planned"]')
  modelSelectorActive = (): Locator => this.page.locator('label[data-id="tab-active"]')
  buttonCreateNewMilestone = (): Locator => this.page.getByRole('button', { name: 'Milestone', exact: true })
  inputNewMilestoneName = (): Locator =>
    this.page.locator('form[id="tracker:string:NewMilestone"] input[placeholder="Milestone name"]')

  inputNewMilestoneDescription = (): Locator => this.page.locator('form[id="tracker:string:NewMilestone"] div.tiptap')
  buttonNewMilestoneSetStatus = (): Locator =>
    this.page.locator('form[id="tracker:string:NewMilestone"] div.antiCard-pool button[type="button"]')

  buttonNewMilestoneTargetDate = (): Locator =>
    this.page.locator('form[id="tracker:string:NewMilestone"] div.antiCard-pool button.datetime-button')

  buttonNewMilestoneCreate = (): Locator =>
    this.page.locator('form[id="tracker:string:NewMilestone"] button[type="submit"]')

  async createNewMilestone (data: NewMilestone): Promise<void> {
    await this.buttonCreateNewMilestone().click()
    await this.inputNewMilestoneName().fill(data.name)
    if (data.description != null) {
      await this.inputNewMilestoneDescription().fill(data.description)
    }
    if (data.status != null) {
      await this.buttonNewMilestoneSetStatus().click()
      await this.selectFromDropdown(this.page, data.status)
    }
    if (data.targetDate != null) {
      await this.buttonNewMilestoneTargetDate().click()
      await this.fillDatePopup(data.targetDate.day, data.targetDate.month, data.targetDate.year)
    }
    if (data.targetDateInDays != null) {
      await this.buttonNewMilestoneTargetDate().click()
      await this.fillDatePopupInDays(data.targetDateInDays)
    }
    await this.buttonNewMilestoneCreate().click()
  }

  async openMilestoneByName (milestoneName: string): Promise<void> {
    await this.page.locator('div.listGrid a', { hasText: milestoneName }).click()
  }

  async checkMilestoneNotExist (milestoneName: string): Promise<void> {
    await expect(this.page.locator('div.listGrid a', { hasText: milestoneName })).toHaveCount(0)
  }
}
