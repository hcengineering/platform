import { expect, test } from '@playwright/test'
import { generateId, openWorkbench } from './utils'

test.describe('contact tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)
  })
  test('update-profile', async ({ page, context }) => {
    // Go to http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp
    await page.goto('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp')
    // Click #profile-button
    await page.click('#profile-button')
    // Click text=Setting
    await page.click('text=Setting')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/setting%3Aids%3ASettingApp/setting')
    // Click text=Edit profile
    await page.click('text=Edit profile')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/setting%3Aids%3ASettingApp/profile')
    // Click [placeholder="Location"]
    await page.click('[placeholder="Location"]')
    // Fill [placeholder="Location"]
    await page.fill('[placeholder="Location"]', 'LoPlaza')
    // Click .flex-center.icon-button
    await page.click('#channels-edit >> .flex-center.icon-button')
    // Click [placeholder="john\.appleseed\@apple\.com"]
    await page.click('[placeholder="john\\.appleseed\\@apple\\.com"]')
    // Fill [placeholder="john\.appleseed\@apple\.com"]
    await page.fill('[placeholder="john\\.appleseed\\@apple\\.com"]', 'wer@qwe.com')
    // Click text=Apply
    await page.click('text=Apply')
  })
  test('create-template', async ({ page }) => {
    // Go to http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp
    await page.goto('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp')
    // Click #profile-button
    await page.click('#profile-button')
    // Click text=Templates
    await page.click('text=Templates')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/setting%3Aids%3ASettingApp/message-templates')
    // Go to http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/setting%3Aids%3ASettingApp/message-templates
    await page.goto('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/setting%3Aids%3ASettingApp/message-templates')
    // Click .flex-center.icon-button
    await page.click('#create-template >> .flex-center.icon-button')
    // Click [placeholder="New\ template"]
    await page.click('[placeholder="New\\ template"]')
    // Fill [placeholder="New\ template"]
    await page.fill('[placeholder="New\\ template"]', 't1')

    await page.fill('.ProseMirror', 'some text value')
    await page.press('.ProseMirror', 'Enter')
    await page.fill('.ProseMirror', 'some more value')

    // Click text=Save template
    await page.click('text=Save template')
    // Click text=Edit template
    await page.click('text=Edit template')
    // Click text=Template valuesome more value
    await page.fill('.ProseMirror', 'some more2 value')
    // Click text=Save template
    await page.click('text=Save template')
    // Click text=Edit template
  })

  test('manage-status-templates', async ({ page }) => {
    // Go to http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp
    await page.goto('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp')
    // Click #profile-button
    await page.click('#profile-button')
    // Click text=Manage Statuses
    await page.click('text=Manage Statuses')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/setting%3Aids%3ASettingApp/statuses')
    // Click text=Vacancies
    await page.click('text=Vacancies')
    // Click #create-template div
    await page.click('#create-template div')
    const tid = 'template-' + generateId()
    const t = page.locator('#templates >> .container:has-text("New Template")').last()
    await t.click()
    await t.locator('input').fill(tid)
    // await page.locator(`#templates >> .container:has-text("${tid}")`).type('Enter')

    // Click text=Active statuses >> div
    await page.click('text=Active statuses >> div')

    const s1 = page.locator('.container:has-text("New State")').first()
    await s1.click()
    await s1.locator('input').fill('State1')

    await page.click('text=Active statuses >> div')
    const s2 = page.locator('.container:has-text("New State")').first()
    await s2.click()
    await s2.locator('input').fill('State2')
    await page.click('text=Active statuses >> div')
    const s3 = page.locator('.container:has-text("New State")').first()
    await s3.click()
    await s3.locator('input').fill('State3')
  })
})
