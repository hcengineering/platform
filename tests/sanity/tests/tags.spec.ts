import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })
  test('create-skill-candidate-with-skill', async ({ page }) => {
    // Go to http://localhost:8083/workbench/sanity-ws
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    // Click [id="app-recruit\:string\:RecruitApplication"]
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit`)
    // Click text=Talents
    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    // Click button:has-text("Talent")
    await page.click('button:has-text("Talent")')
    // Fill [placeholder="John"]
    await page.fill('[placeholder="First name"]', 'Petr')
    // Click [placeholder="Appleseed"]
    await page.click('[placeholder="Last name"]')
    // Fill [placeholder="Appleseed"]
    await page.fill('[placeholder="Last name"]', 'Dooliutl')
    // Click .ml-4 .tooltip-trigger .flex-center
    await page.click('button:has-text("Skills")')
    // Click text=Add/Create Skill Suggested Cancel >> button
    await page.click('.header > button:nth-child(3)')
    // Fill [placeholder="Please\ type\ Skill\ title"]
    await page.fill('[placeholder="Please\\ type\\ \\ title"]', 's1')
    // Click text=Create Skill s1 Please type description here Category Other Create Cancel >> button
    await page.click('form[id="tags:string:AddTag"]  button:has-text("Create")')
    await page.waitForSelector('form[id="tags:string:AddTag"]', { state: 'detached' })
    await page.click('button:has-text("Other")')
    // Click text=s1
    // await page.click('text=s1')
    await page.click('button:has-text("s1") .check')
    // Click :nth-match(:text("Cancel"), 2)
    // await page.click('button:has-text("Cancel")')
    await page.keyboard.press('Escape')
    // await page.keyboard.press('Escape')
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
  })

  test('create-tag-candidate', async ({ page }) => {
    // Go to http://localhost:8083/workbench/sanity-ws
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
    // Click [id="app-recruit\:string\:RecruitApplication"]
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit`)
    // Click text=Skills
    await page.click('text=Skills')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/skills`)
    // Click button:has-text("Skill")
    await page.click('button:has-text("Skill")')
    // Click [placeholder="Please\ type\ skill\ title"]
    await page.click('[placeholder="Please\\ type\\ skill\\ title"]')
    // Fill [placeholder="Please\ type\ skill\ title"]
    await page.fill('[placeholder="Please\\ type\\ skill\\ title"]', 'java')
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
    // Click button:has-text("Skill")
    await page.click('button:has-text("Skill")')
    // Fill [placeholder="Please\ type\ skill\ title"]
    await page.fill('[placeholder="Please\\ type\\ skill\\ title"]', 'MongoDB')
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
    // Click button:has-text("Skill")
    await page.click('button:has-text("Skill")')
    // Fill [placeholder="Please\ type\ skill\ title"]
    await page.fill('[placeholder="Please\\ type\\ skill\\ title"]', 'C++')
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    // Click text=Talents
    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    // Click button:has-text("Talent")
    await page.click('button:has-text("Talent")')
    // Click #add-tag div div
    await page.click('button:has-text("Skills")')
    await page.click('button:has-text("Backend development")')
    // Click text=java
    await page.click('text=java')
    // Click :nth-match(:text("Cancel"), 2)
    // await page.click('button:has-text("Cancel")')
    await page.keyboard.press('Escape')
    // Click [placeholder="John"]
    await page.click('[placeholder="First name"]')
    // Fill [placeholder="John"]
    const first = 'first-' + generateId(4)
    await page.fill('[placeholder="First name"]', first)
    // Click [placeholder="Appleseed"]
    await page.click('[placeholder="Last name"]')
    // Fill [placeholder="Appleseed"]
    const last = 'last-' + generateId(4)
    await page.fill('[placeholder="Last name"]', last)
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })
    // Click text=q w
    await page.click(`tr > :has-text("${last} ${first}")`)
    // Click text=java
    await expect(page.locator('text=java').first()).toBeVisible()
  })
})
