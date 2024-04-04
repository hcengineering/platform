import { Page, expect } from '@playwright/test'

export class CommonPage {
  async selectMenuItem (page: Page, name: string, fullWordFilter: boolean = false): Promise<void> {
    if (name !== 'first') {
      const filterText = fullWordFilter ? name : name.split(' ')[0]
      await page.locator('div.selectPopup input').fill(filterText)
      // TODO need to remove after fixed UBERF-4968
      await page.waitForTimeout(300)
    }
    await page.locator('div.selectPopup div.list-item:first-child').click()
  }

  async pressCreateButtonSelectPopup (page: Page): Promise<void> {
    await page.locator('div.selectPopup div.header button:last-child').click()
  }

  async pressShowAllButtonSelectPopup (page: Page): Promise<void> {
    await page.locator('div.selectPopup div.header button:nth-of-type(1)').click()
  }

  async selectFromDropdown (page: Page, point: string): Promise<void> {
    await page.locator('div[class$="opup"] span[class*="label"]', { hasText: point }).click()
  }

  async checkDropdownHasNo (page: Page, item: string): Promise<void> {
    await expect(page.locator('div.selectPopup span[class^="lines"]', { hasText: item })).not.toBeVisible()
  }

  async fillToDropdown (page: Page, input: string): Promise<void> {
    await page.locator('div.popup input.search').fill(input)
    await page.locator('div.popup button#channel-ok').click()
  }

  async fillToSelectPopup (page: Page, input: string): Promise<void> {
    await expect(page.locator('div.selectPopup input')).toBeVisible()
    await page.locator('div.selectPopup input').fill(input)
    await page.locator('div.selectPopup button').click()
  }

  async fillToSelectPopupWithCrossButton (page: Page, input: string): Promise<void> {
    await expect(page.locator('div.selectPopup input')).toBeVisible()
    await page.locator('div.selectPopup input').fill(input)
    await page.locator('div.selectPopup button.menu-item').click()
  }



  async checkFromDropdown (page: Page, point: string): Promise<void> {
    await page.locator('div.selectPopup span[class^="lines"]', { hasText: point }).first().click()
  }

  async pressYesDeletePopup (page: Page): Promise<void> {
    await page.locator('form[id="view:string:DeleteObject"] button.primary').click()
  }

  async addNewTagPopup (page: Page, title: string, description: string): Promise<void> {
    await page.locator('div.popup form[id="tags:string:AddTag"] input[placeholder$="title"]').fill(title)
    await page
      .locator('div.popup form[id="tags:string:AddTag"] input[placeholder="Please type description here"]')
      .fill(description)
    await page.locator('div.popup form[id="tags:string:AddTag"] button[type="submit"]').click()
  }

  async selectAssignee (page: Page, name: string): Promise<void> {
    if (name !== 'first') {
      await page.locator('div.selectPopup input').fill(name.split(' ')[0])
      await expect(page.locator('div.selectPopup div.list-item')).toHaveCount(1)
    }
    await page.locator('div.selectPopup div.list-item').click()
  }

  async checkExistNewNotification (page: Page): Promise<void> {
    await expect(page.locator('button[id$="Inbox"] > div.noty')).toBeVisible()
  }

  async pressYesForPopup (page: Page): Promise<void> {
    await expect(page.locator('div.popup button[type="submit"]')).toBeVisible()
    await page.locator('div.popup button[type="submit"]').click()
  }

  async pressButtonBack (page: Page): Promise<void> {
    await page.locator('div.history-box button:first-child').click()
  }

  async checkFromDropdownWithSearch (page: Page, point: string): Promise<void> {
    await page.locator('div.selectPopup input').fill(point)
    await page.locator('div.selectPopup span[class^="lines"]', { hasText: point }).click()
  }

  async closeNotification (page: Page): Promise<void> {
    await page.locator('div.notify-container button[type="button"].small').nth(0).click()
  }

  async checkError (page: Page, errorMessage: string): Promise<void> {
    await expect(page.locator('div.ERROR span')).toHaveText(errorMessage)
  }

  async checkInfo (page: Page, errorMessage: string): Promise<void> {
    await expect(page.locator('div.INFO span')).toHaveText(errorMessage)
  }

  async checkInfoSectionNotExist (page: Page): Promise<void> {
    await expect(page.locator('div.INFO span')).not.toBeAttached()
  }

  async selectMention (page: Page, mentionName: string): Promise<void> {
    await page.locator('form.mentionPoup div.list-item span.name', { hasText: mentionName }).click()
  }

  async selectListItem (page: Page, name: string): Promise<void> {
    await page.locator('div.selectPopup div.list-item', { hasText: name }).click({ delay: 100 })
  }

  async selectPopupItem (page: Page, name: string): Promise<void> {
    await page.locator('div.hulyPopup-container button.hulyPopup-row', { hasText: name }).click({ delay: 100 })
  }

  async closePopup (page: Page): Promise<void> {
    await page.locator('div.popup button[id="card-close"]').click()
  }

  async checkPopupItem (page: Page, itemText: string): Promise<void> {
    await expect(page.locator('div.selectPopup button.menu-item', { hasText: itemText })).toBeVisible()
  }
}
