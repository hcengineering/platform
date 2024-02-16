import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('interview tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  // test.skip('create-interview', async ({ page }) => {
  //   await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()
  //
  //   const interviewId = 'My interview ' + generateId(4)
  //
  //   await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()
  //
  //   await page.click('text=Reviews')
  //
  //   await page.click('button:has-text("Review")')
  //
  //   await page.click('[placeholder="Title"]')
  //
  //   await page.fill('[placeholder="Title"]', `Meet Peterson ${interviewId}`)
  //
  //   await page.click('[placeholder="Location"]')
  //
  //   await page.fill('[placeholder="Location"]', 'NSK')
  //   await page.click('form button:has-text("Talent")')
  //   await page.click('button:has-text("P. Andrey")')
  //   await page.click('text=Create')
  //   await page.waitForSelector('form.antiCard', { state: 'detached' })
  //   await page.click('td:has-text("RVE-")')
  // })
})
