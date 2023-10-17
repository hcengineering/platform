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

  async createNewTalentPopup (page: Page, firstName: string, lastName: string): Promise<void> {
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="First name"]').fill(firstName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="Last name"]').fill(lastName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] button[type="submit"]').click()
  }
}
