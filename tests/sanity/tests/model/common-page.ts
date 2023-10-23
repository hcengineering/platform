import { Page } from '@playwright/test'

export class CommonPage {
  async fillSelectPopup (page: Page, name: string): Promise<void> {
    if (name !== 'first') {
      await page.locator('div.selectPopup input').fill(name)
    }
    await page.locator('div.selectPopup div.list-item:first-child').click()
  }

  async pressCreateButtonSelectPopup (page: Page): Promise<void> {
    await page.locator('div.selectPopup div.header button').click()
  }

  async selectFromDropdown (page: Page, point: string): Promise<void> {
    await page.locator('div.selectPopup span[class*="label"]', { hasText: point }).click()
  }

  async createNewTalentPopup (page: Page, firstName: string, lastName: string): Promise<void> {
    await page
      .locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="First name"]')
      .fill(firstName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="Last name"]').fill(lastName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] button[type="submit"]').click()
  }

  async createNewReviewPopup (page: Page, title: string, description: string): Promise<void> {
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] input[placeholder="Title"]').fill(title)
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] div.text-editor-view').fill(description)
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] button[type="submit"]').click()
  }

  async pressYesDeletePopup (page: Page): Promise<void> {
    await page.locator('form[id="view:string:DeleteObject"] button.primary').click()
  }
}
