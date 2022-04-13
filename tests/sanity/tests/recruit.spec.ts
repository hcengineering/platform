import { expect, test } from '@playwright/test'
import { generateId, openWorkbench } from './utils'

test.describe('recruit tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await openWorkbench(page)
  })
  test('create-candidate', async ({ page, context }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Candidates')

    await page.click('button:has-text("Candidate")')

    const first = 'Elton-' + generateId(4)
    const last = 'John-' + generateId(4)

    const firstName = page.locator('[placeholder="John"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Appleseed"]')
    await lastName.click()
    await lastName.fill(last)

    const title = page.locator('[placeholder="Title"]')
    await title.click()
    await title.fill('Super Candidate')

    const location = page.locator('[placeholder="Location"]')
    await location.click()
    await location.fill('Cupertino')

    await page.locator('.antiCard').locator('button:has-text("Create")').click()
  })

  test('create-application', async ({ page }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    const vacancyId = 'My vacancy ' + generateId(4)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()

    await page.click('button:has-text("Vacancy")')
    await page.fill('[placeholder="Software\\ Engineer"]', vacancyId)
    await page.click('button:has-text("Create")')
    await page.locator(`text=${vacancyId}`).click()

    await page.click('text=Candidates')

    await page.click('text=Candidates')
    await page.click('text=Andrey P.')
    await page.locator('.mixin-selector').locator('text="Candidate"').click()

    // Click on Add button
    await page.click('.applications-container .flex-row-center .flex-center')

    await page.click('button:has-text("Vacancy")')

    await page.click(`button:has-text("${vacancyId}")`)

    await page.click('button:has-text("Create")')

    await page.locator(`tr:has-text("${vacancyId}") >> text=APP-`).click()
    await page.click('button:has-text("Assigned recruiter")')
    await page.click('button:has-text("Rosamund Chen")')
  })

  test('create-vacancy', async ({ page }) => {
    const vacancyId = 'My vacancy ' + generateId(4)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()

    await page.click('button:has-text("Vacancy")')
    await page.fill('[placeholder="Software\\ Engineer"]', vacancyId)
    await page.click('button:has-text("Create")')
    await page.locator(`text=${vacancyId}`).click()

    // Create Applicatio n1
    await page.click('button:has-text("Application")')
    await page.click('button:has-text("Candidate")')
    await page.click('button:has-text("Alex P.")')
    await page.click('button:has-text("Create")')

    await expect(page.locator('text=APP-').first()).toBeVisible()
    await expect(page.locator('text=Alex P.').first()).toBeVisible()
  })
  test('use-kanban', async ({ page }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()
    await page.click('text=Software Engineer')

    await page.click('[name="tooltip-task:string:Kanban"]')

    await expect(page.locator('text=Marina M.').first()).toBeVisible()
    await expect(page.locator('text=John Multiseed').first()).toBeVisible()
    await expect(page.locator('text=Alex P.').first()).toBeVisible()
  })

  test('application-search', async ({ page }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()
    await page.click('text=Software Engineer')

    await expect(page.locator('text=Marina M.')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(2)

    const searchBox = page.locator('[placeholder="Search"]')
    await searchBox.fill('Frontend Engineer')
    await searchBox.press('Enter')

    await expect(page.locator('.antiTable-body__row')).toHaveCount(1)

    await searchBox.fill('')
    await searchBox.press('Enter')

    await expect(page.locator('text=Marina M.')).toBeVisible()
    expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(2)
  })

  test('create-interview', async ({ page }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    const interviewId = 'My interview ' + generateId(4)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.hover('text=Reviews')
    await page.click('[name="tooltip-recruit:string:CreateReviewCategory"]')

    await page.fill('[placeholder="Interview"]', interviewId)
    await page.click('button:has-text("Create")')
    await page.locator(`text=${interviewId}`).click()

    // Click button:has-text("Review")
    await page.click('button:has-text("Review")')
    // Click [placeholder="\ "]
    await page.click('[placeholder="Title"]')
    // Fill [placeholder="\ "]
    await page.fill('[placeholder="Title"]', 'Meet PEterson')
    // Click text=Location Company Company >> [placeholder="\ "]
    await page.click('[placeholder="Location"]')
    // Fill text=Location Company Company >> [placeholder="\ "]
    await page.fill('[placeholder="Location"]', 'NSK')
    // Click text=Company Company >> div
    // await page.click('text=Company Company >> div')
    // Click button:has-text("Apple")
    // await page.click('button:has-text("Apple")')
    // Click text=Candidate Not selected >> span
    await page.click('button:has-text("Candidate")')
    // Click button:has-text("Andrey P.")
    await page.click('button:has-text("Andrey P.")')
    // Click text=Create
    await page.click('text=Create')

    await page.click('td:has-text("RVE-")')
  })
})
