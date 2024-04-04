import { expect, type Locator, type Page } from '@playwright/test'
import { NewSkill } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class SkillsPage extends CommonRecruitingPage {
    readonly page: Page
    readonly buttonCreateNewSkill: Locator
    readonly inputSkillTitle: Locator
    readonly inputSkillDescription: Locator
    readonly buttonOtherCategory: Locator
    readonly buttonCreateSkill: Locator
    readonly textSkillTitle: Locator
    readonly textDescription: Locator
    readonly buttonYesButton: Locator

    constructor (page: Page) {
        super(page)
        this.page = page
        this.buttonCreateNewSkill = page.locator('button > span', { hasText: 'Skill' })
        this.inputSkillTitle = page.locator('input[placeholder="Please type skill title"]')
        this.inputSkillDescription = page.locator('input[placeholder="Please type description here"]')
        this.buttonOtherCategory = page.locator('button > span', { hasText: 'Other'})
        this.buttonCreateSkill = page.locator('button > span', { hasText: 'Create'})
        this.textSkillTitle = page.locator('span.overflow-label.max-w-40')
        this.textDescription = page.locator('span.lines-limit-2')
        this.buttonYesButton = page.locator('button.antiButton.primary', { hasText: 'Yes' })
    }

    async createNewSkill ({ title, description, category }: NewSkill): Promise<void> {
        await this.buttonCreateNewSkill.click()
        await this.inputSkillTitle.fill(title)
        await this.inputSkillDescription.fill(description)
        await this.buttonOtherCategory.click()
        await this.fillToSelectPopupWithCrossButton(this.page, category)
        await this.buttonCreateSkill.click()
        
    }

    async checkSkillHasBeenAdded({title, description, category}: NewSkill): Promise<void> {
        await expect(this.textSkillTitle.filter({ hasText: title })).toBeVisible()
        await expect(this.textDescription.filter({ hasText: description })).toBeVisible()
    }

    async rightClickOnSkillTitle(newSkill: NewSkill): Promise<void> {
        this.page.locator('span.overflow-label.max-w-40', { hasText: newSkill.title}).click({ button: 'right' })
    }

    async clickOnDeleteAndConfirmIt(): Promise<void> {
        this.page.locator('.antiPopup')
            .locator('text=Delete')
            .click()
        this.buttonYesButton.click()
    }

    async checkSkillIsDeleted(newSkill: NewSkill): Promise<void> {
        await expect(this.textSkillTitle.filter({ hasText: newSkill.title })).toBeHidden()
    }

}

