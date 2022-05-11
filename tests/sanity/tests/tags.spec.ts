import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
  })
  test('create-candidate-with-skill', async ({ page }) => {
    // Go to http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp
    await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
    // Click [id="app-recruit\:string\:RecruitApplication"]
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit`)
    // Click text=Candidates
    await page.click('text=Candidates')
    await expect(page).toHaveURL(
      `${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit/candidates`
    )
    // Click button:has-text("Candidate")
    await page.click('button:has-text("Candidate")')
    // Fill [placeholder="John"]
    await page.fill('[placeholder="John"]', 'Petr')
    // Click [placeholder="Appleseed"]
    await page.click('[placeholder="Appleseed"]')
    // Fill [placeholder="Appleseed"]
    await page.fill('[placeholder="Appleseed"]', 'Dooliutl')
    // Click .ml-4 .tooltip-trigger .flex-center
    await page.click('button:has-text("Skills")')
    // Click text=Add/Create Skill Suggested Cancel >> button
    await page.click('.buttons-group button:nth-child(3)')
    // Fill [placeholder="Please\ type\ Skill\ title"]
    await page.fill('[placeholder="Please\\ type\\ \\ title"]', 's1')
    // Click text=Create Skill s1 Please type description here Category Other Create Cancel >> button
    await page.click('form[id="tags:string:AddTag"]  button:has-text("Create")')
    await page.click('button:has-text("Other")')
    // Click text=s1
    await page.click('text=s1')
    // Click :nth-match(:text("Cancel"), 2)
    // await page.click('button:has-text("Cancel")')
    await page.keyboard.press('Escape')
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
  })

  test('create-tag-candidate', async ({ page }) => {
    // Go to http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp
    await page.goto(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp`)
    // Click [id="app-recruit\:string\:RecruitApplication"]
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit`)
    // Click text=Skills
    await page.click('text=Skills')
    await expect(page).toHaveURL(`${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit/skills`)
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
    // Click text=Candidates
    await page.click('text=Candidates')
    await expect(page).toHaveURL(
      `${PlatformURI}/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit/candidates`
    )
    // Click button:has-text("Candidate")
    await page.click('button:has-text("Candidate")')
    // Click #add-tag div div
    await page.click('button:has-text("Skills")')
    await page.click('button:has-text("Backend development")')
    // Click text=java
    await page.click('text=java')
    // Click :nth-match(:text("Cancel"), 2)
    // await page.click('button:has-text("Cancel")')
    await page.keyboard.press('Escape')
    // Click [placeholder="John"]
    await page.click('[placeholder="John"]')
    // Fill [placeholder="John"]
    const first = 'first-' + generateId().slice(0, 4)
    await page.fill('[placeholder="John"]', first)
    // Click [placeholder="Appleseed"]
    await page.click('[placeholder="Appleseed"]')
    // Fill [placeholder="Appleseed"]
    const last = 'last-' + generateId().slice(0, 4)
    await page.fill('[placeholder="Appleseed"]', last)
    // Click button:has-text("Create")
    await page.click('button:has-text("Create")')
    // Click text=q w
    await page.click(`text=${first} ${last}`)
    // Click text=java
    await expect(page.locator('text=java').first()).toBeVisible()
  })
})
