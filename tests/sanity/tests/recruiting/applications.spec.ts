import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create-application', async ({ page }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()
    await page.waitForLoadState('load')

    const vacancyId = 'My vacancy ' + generateId(4)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()

    await page.click('button:has-text("Vacancy")')
    await page.fill('[placeholder="Software\\ Engineer"]', vacancyId)
    await page.click('button:has-text("Create")')
    await page.click(`tr > :has-text("${vacancyId}")`)

    await page.click('text=Talents')

    await page.click('text=Talents')
    await page.click('text=P. Andrey')

    // Click on Add button
    // await page.click('.applications-container .flex-row-center .flex-center')
    await page.click('button[id="appls.add"]')

    await page.click('[id = "space.selector"]')

    await page.fill('[placeholder="Search..."]', vacancyId)
    await page.click(`button:has-text("${vacancyId}")`)

    await page.waitForSelector('space.selector', { state: 'detached' })
    await expect(
      await page.locator('[id="recruit:string:CreateApplication"] button:has-text("HR Interview")')
    ).toBeVisible()
    // We need to be sure state is proper one, no other way to do it.
    await page.waitForTimeout(100)

    await page.click('button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await page.click(`tr:has-text("${vacancyId}") >> text=APP-`)
    await page.click('button:has-text("Assigned recruiter")')
    await page.click('button:has-text("Chen Rosamund")')
  })
})
