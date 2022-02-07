import { expect, test } from '@playwright/test'
import { openWorkbench } from './utils'

test.describe('recruit tests', () => {
  test('create-candidate', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Candidates')

    await page.click('button:has-text("Create")')

    const firstName = page.locator('[placeholder="John"]')
    await firstName.click()
    await firstName.fill('EltonC')

    const lastName = page.locator('[placeholder="Appleseed"]')
    await lastName.click()
    await lastName.fill('JohnC')

    const title = page.locator('[placeholder="Title"]')
    await title.click()
    await title.fill('Super Candidate')

    const location = page.locator('[placeholder="Location"]')
    await location.click()
    await location.fill('Cupertino')

    await page.locator('.card-container').locator('button:has-text("Create")').click()
  })

  test('create-application', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Candidates')

    await page.click('text=Candidates')
    await page.click('text=Andrey P.')
    await page.locator('.mixin-selector').locator('text="Candidate"').click()

    // Click on Add button
    await page.click('.applications-container .flex-row-center .flex-center')

    await page.click('span:has-text("Select vacancy")')

    await page.click('button:has-text("Software Engineer")')

    await page.click('text=Create Cancel >> button')

    await page.click('text=APP-4')
    await page.click('text=Assigned recruiter Not selected >> div')
    await page.click('button:has-text("Rosamund Chen")')
  })

  test('create-vacancy', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').hover()
    await page.click('text=Vacancies Software Engineer >> button')

    await page.click('[placeholder="Software\\ Engineer"]')
    await page.fill('[placeholder="Software\\ Engineer"]', 'My vacancy')
    await page.click('button:has-text("Create")')

    await page.click('span:has-text("My vacancy")')

    // Create Applicatio n1
    await page.click('text=Create')
    await page.click('text=Not selected')
    await page.click('button:has-text("Alex P.")')
    await page.click('text=Create Cancel >> button')

    await expect(page.locator('text=APP-').first()).toBeVisible()
    await expect(page.locator('text=Alex P.').first()).toBeVisible()
  })
  test('use-kanban', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Software Engineer')

    await page.click('[name="tooltip-task:string:Kanban"]')

    await expect(page.locator('text=Marina M.').first()).toBeVisible()
    await expect(page.locator('text=John Multiseed').first()).toBeVisible()
    await expect(page.locator('text=Alex P.').first()).toBeVisible()
  })

  test('application-search', async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Software Engineer')

    await expect(page.locator('text=Andrey P.')).toBeVisible()
    expect(await page.locator('.tr-body').count()).toBeGreaterThan(2)

    const searchBox = page.locator('[placeholder="Search"]')
    await searchBox.fill('Frontend Engineer')
    await searchBox.press('Enter')

    await expect(page.locator('.tr-body')).toHaveCount(1)

    await searchBox.fill('')
    await searchBox.press('Enter')

    await expect(page.locator('text=Andrey P.')).toBeVisible()
    expect(await page.locator('.tr-body').count()).toBeGreaterThan(2)
  })
})
