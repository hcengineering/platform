import { expect, test } from '@playwright/test'
import { generateId, openWorkbench } from './utils'

test.describe('workbench tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)
  })
  test('navigator', async ({ page }) => {
    // Click [id="app-recruit\:string\:RecruitApplication"]
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit')
    // Click text=Applications
    await page.click('text=Applications')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit/applicants')
    // Click text=Applications Application >> span
    await expect(page.locator('text=Applications Application >> span')).toBeVisible()
    await expect(page.locator('text=APP-1')).toBeVisible()

    // Click text=Candidates
    await page.click('text=Candidates')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit/candidates')

    await expect(page.locator('text=Candidates Candidate >> span')).toBeVisible()
    await expect(page.locator('text=Andrey P.')).toBeVisible()

    // Click text=Vacancies
    await page.click('text=Vacancies')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/recruit%3Aapp%3ARecruit/vacancies')
    // Click text=Software Engineer
    await page.click('text=Software Engineer');
    await expect(page.locator('text=Software Engineer')).toBeVisible()
    await expect(page.locator('text=APP-1')).toBeVisible()
    await page.click('[name="tooltip-task:string:Kanban"]')

    // Click [id="app-chunter\:string\:ApplicationLabelChunter"]
    await page.click('[id="app-chunter\\:string\\:ApplicationLabelChunter"]')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/chunter%3Aapp%3AChunter')

    await page.click('text=general')

    // Click .textInput
    await expect(page.locator('.textInput')).toBeVisible()

    await page.click('[id="app-contact\\:string\\:Contacts"]')
    await expect(page).toHaveURL('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp/contact%3Aapp%3AContacts')
    // Click text=John Appleseed
    await expect(page.locator('text=John Appleseed')).toBeVisible()
  })
})
