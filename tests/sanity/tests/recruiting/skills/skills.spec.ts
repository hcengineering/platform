import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from '../../utils'

test.use({
  storageState: PlatformSetting
})

test.describe('Recruiting. Kill tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  // test.skip('create skill', async ({ page }) => {
  //   await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
  //   await page.click('text=Skills')
  //   await page.click('button:has-text("Skill")')
  //   await page.click('[placeholder="Please\\ type\\ skill\\ title"]')
  //   const skillId = 'custom-skill-' + generateId()
  //   await page.fill('[placeholder="Please\\ type\\ skill\\ title"]', skillId)
  //   await page.click('button:has-text("Other")')
  //   await page.click('button:has-text("Design")')
  //   await page.click('button:has-text("Create")')
  //   await page.click(`text=${skillId}`)
  //   await page.click('[placeholder="Please\\ type\\ description\\ here"]')
  //   await page.fill('[placeholder="Please\\ type\\ description\\ here"]', 'description-' + skillId)
  //   await page.click('button:has-text("Save")')
  //   await page.click(`span:has-text("description-${skillId}")`)
  // })
})
