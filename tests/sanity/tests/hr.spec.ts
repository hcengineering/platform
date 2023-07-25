import { expect, Page, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

export async function createDepartment (page: Page, departmentName: string): Promise<void> {
  await page.click('button:has-text("Department")')
  const departmentNameField = page.locator('[placeholder="Department"]')
  await departmentNameField.click()
  await departmentNameField.fill(departmentName)
  await page.locator('.antiCard button:has-text("Create")').click()
  await page.waitForSelector('form.antiCard', { state: 'detached' })
}

test.describe('hr tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test.skip('test-pto-after-department-change', async ({ page }) => {
    await page.locator('[id="app-hr\\:string\\:HRApplication"]').click()
    await page.click('text="Structure"')
    const department1 = 'dep1'
    const department2 = 'dep2'
    await createDepartment(page, department1)
    await createDepartment(page, department2)

    // Click .ml-8 > div > div > .flex-between >> nth=0
    await page.locator('.flex-col > div > .flex-between >> nth=0').click()

    // Click [id="hr\:string\:AddEmployee"]
    await page.locator('[id="hr\\:string\\:AddEmployee"]').click()

    // Click button:has-text("Appleseed John")
    await page.locator('button:has-text("Appleseed John")').click()

    // Click text=Schedule
    await page.locator('text=Schedule').click()

    // Click td:nth-child(15) > .h-full
    await page.locator('td:nth-child(15) > .h-full').click()

    // Click button:has-text("Vacation")
    await page.locator('button:has-text("Vacation")').click()

    // Click button:has-text("PTO") >> nth=0
    await page.locator('button:has-text("Remote")').first().click()

    // Click button:has-text("Create")
    await page.locator('button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    // Click text=Structure
    await page.locator('text=Structure').click()

    // Click div:nth-child(3) > div > .flex-between
    await page.locator('div:nth-child(2) > .flex-between').click()

    // Click [id="hr\:string\:AddEmployee"]
    await page.locator('[id="hr\\:string\\:AddEmployee"]').click()

    // Click button:has-text("Appleseed John")
    await page.locator('button:has-text("Appleseed John")').click()

    // Click button:has-text("Ok")
    await page.locator('button:has-text("Ok")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    // Click text=Schedule
    await page.locator('text=Schedule').click()
    await expect(await page.locator('td:nth-child(15) > .h-full .request')).toHaveCSS('opacity', '0.5')
  })
})
