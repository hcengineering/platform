import { expect, test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})
test.describe('contact tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('update-profile', async ({ page, context }) => {
    // Go to http://localhost:8083/workbench/sanity-ws
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    // Click #profile-button
    await page.click('#profile-button')
    await page.click('text=Appleseed John')
    // await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/setting/setting`)
    // Click text=Edit profile
    // await page.click('text=Edit profile')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/setting/profile`)

    // Click [placeholder="Location"]
    await page.click('[placeholder="Location"]')
    // Fill [placeholder="Location"]
    await page.fill('[placeholder="Location"]', 'LoPlaza')
    // Click .flex-center.icon-button

    if ((await page.locator('[id="contact:string:Phone"]').count()) === 0) {
      await page.click('[id="presentation:string:AddSocialLinks"]')
      await page.click('.popup button:has-text("Phone")')
    } else {
      await page.click('id=contact:string:Phone')
    }
    await page.fill('[placeholder="+1 555 333 7777"]', '+1 555 333 7777')
    // Click text=Apply
    await page.click('.editor-container button:nth-child(3)')
  })

  test('create-template', async ({ page }) => {
    // Go to http://localhost:8083/workbench/sanity-ws
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    // Click #profile-button
    await page.click('#profile-button')
    // Click button:has-text("Settings")
    // await page.hover('button:has-text("Settings")')
    await page.click('button:has-text("Settings")')
    // Click text=Workspace Notifications >> button
    // await page.click('.box > div:nth-child(4)')
    await page.getByRole('button', { name: 'Notifications' }).click()
    await page.click('text="Text Templates"')
    // Click .flex-center.icon-button
    await page.click('#create-template')
    // Click [placeholder="New\ template"]
    // await page.click('[placeholder="New\\ template"]')
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

  test('manage-templates', async ({ page }) => {
    // Go to http://localhost:8083/workbench/sanity-ws
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    // Click #profile-button
    await page.click('#profile-button')
    // await page.click('text=Workspace')
    // await page.hover('button:has-text("Settings")')
    await page.click('button:has-text("Settings")')
    // Click text=Workspace Notifications >> button
    // await page.click('.box > div:nth-child(4)')
    await page.getByRole('button', { name: 'Notifications' }).click()
    // Click text=Vacancies
    await page.locator('#new-space-type').click()
    // TODO: Need rework.
    // await page.getByRole('button', { name: 'Recruiting', exact: true }).click()
    // await page.locator('#navGroup-statuses').getByText('New Recruiting project type').first().click()

    // // Click #create-template div
    // await page.click('#create-template div')
    // const tid = 'template-' + generateId()
    // const t = page.locator('#templates div:has-text("New project type")').first()
    // await t.click()
    // await t.locator('input').fill(tid)
    // // await page.locator(`#templates >> .container:has-text("${tid}")`).type('Enter')

    // await page.locator('.states >> svg >> nth=1').click()
    // await page.locator('text=Rename').click()
    // await page.locator('.box > .antiEditBox input').fill('State1')
    // await page.locator('button:has-text("Save")').click()
    // await page.waitForSelector('form.antiCard', { state: 'detached' })
    // await page.click('text=STATUS >> div')
    // await page.locator('.box > .antiEditBox input').fill('State2')
    // await page.locator('button:has-text("Save")').click()
    // await page.waitForSelector('form.antiCard', { state: 'detached' })
    // await page.click('text=STATUS >> div')
    // await page.locator('.box > .antiEditBox input').fill('State3')
    // await page.locator('button:has-text("Save")').click()
    // await page.waitForSelector('form.antiCard', { state: 'detached' })
  })
})
