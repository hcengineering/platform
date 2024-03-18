import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { VacanciesPage } from '../model/recruiting/vacancies-page'
import { VacancyDetailsPage } from '../model/recruiting/vacancy-details-page'
import { CommonPage } from '../model/common-page'
import { NewVacancy } from '../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Vacancy tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create-vacancy', async ({ page }) => {
    const vacancyId = 'My vacancy ' + generateId(4)

    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()

    await page.click('button:has-text("Vacancy")')
    await page.fill('form  [placeholder="Software\\ Engineer"]', vacancyId)
    await page.click('form button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await page.click(`tr:has-text("${vacancyId}") > td:nth-child(3) >> .sm-tool-icon`)

    // Create Application1
    await page.click('button:has-text("Application")')
    await page.click('form[id="recruit:string:CreateApplication"] [id="vacancy.talant.selector"]')

    await new CommonPage().selectAssignee(page, 'Alex')
    await page.click('form[id="recruit:string:CreateApplication"] button:has-text("Create")')
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await expect(page.locator('text=APP-').first()).toBeVisible()
    await expect(page.locator('text=P. Alex').first()).toBeVisible()
  })

  test('use-kanban', async ({ page }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.locator('text=Vacancies').click()
    await page.click('text=Software Engineer')

    // await page.click('[name="tooltip-task:string:Kanban"]')
    await page.click('.antiSection-header >> text=Applications')
    await page.click('.tablist-container div:nth-child(2)')

    await expect(page.locator('text=M. Marina').first()).toBeVisible()
    await expect(page.locator('text=Multiseed John').first()).toBeVisible()
    await expect(page.locator('text=P. Alex').first()).toBeVisible()
  })

  // test('application-search', async ({ page }) => {
  // TODO: Application search is broken, since indexer now index from child to parent.
  //   await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

  //   await page.locator('text=Vacancies').click()
  //   await page.click('text=Software Engineer')

  //   await expect(page.locator('text=M. Marina')).toBeVisible()
  //   expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(2)

  //   const searchBox = page.locator('[placeholder="Search"]')
  //   await searchBox.fill('Frontend Engineer')
  //   await searchBox.press('Enter')

  //   await expect(page.locator('.antiTable-body__row')).toHaveCount(1)

  //   await searchBox.fill('')
  //   await searchBox.press('Enter')

  //   await expect(page.locator('text=M. Marina')).toBeVisible()
  //   expect(await page.locator('.antiTable-body__row').count()).toBeGreaterThan(2)
  // })

  test('Edit a Vacancy', async ({ page }) => {
    const vacancyName = 'Edit Vacancy ' + generateId(4)

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonVacancies.click()
    const vacanciesPage = new VacanciesPage(page)
    await vacanciesPage.createNewVacancy({
      title: vacancyName,
      description: 'Vacancy description from Edit a Vacancy test',
      location: 'Edit a Vacancy location'
    })

    await vacanciesPage.openVacancyByName(vacancyName)

    const vacancyDetailsPage = new VacancyDetailsPage(page)
    await vacancyDetailsPage.addComment('Test Vacancy Comment 12345')
    await vacancyDetailsPage.checkCommentExist('Test Vacancy Comment 12345')

    await vacancyDetailsPage.inputDescription.fill('Edit a Vacancy description')
    await expect(vacancyDetailsPage.inputDescription).toHaveText('Edit a Vacancy description')

    await vacancyDetailsPage.addAttachments('cat.jpeg')

    await vacancyDetailsPage.addDescription('Vacancy Description left-side menu')
    await vacancyDetailsPage.addLocation('Edit Vacancy Location')
    await vacancyDetailsPage.addCompany('Apple')
    await vacancyDetailsPage.addDueDateToday()
  })

  test('Filter vacancies', async ({ page }) => {
    // viable when test set of vacancies fits to single page
    const vacancyName = 'Archive Vacancy ' + generateId(5)
    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonVacancies.click()
    const vacanciesPage = new VacanciesPage(page)
    await vacanciesPage.createNewVacancy({
      title: vacancyName,
      description: 'Vacancy description from Filter vacancies test',
      location: 'Filter vacancies location'
    })
    await vacanciesPage.checkVacancyExist(vacancyName, `Created vacancy "${vacancyName}" visible by default.`)
    await vacanciesPage.archiveVacancyByName(vacancyName)

    await vacanciesPage.checkVacancyNotExist(vacancyName, `Archieved vacancy "${vacancyName}" not visible by default.`)

    await vacanciesPage.showArchivedVacancy()

    await vacanciesPage.checkVacancyExist(
      vacancyName,
      `Archieved vacancy "${vacancyName}" visible when hide archved off.`
    )

    await vacanciesPage.buttonHideArchivedVacancies.click()

    await vacanciesPage.checkVacancyNotExist(
      vacancyName,
      `Archieved vacancy "${vacancyName}" not visible when hide archved back on.`
    )
  })

  test('Export vacancies', async ({ page }) => {
    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonVacancies.click()

    const vacanciesPage = new VacanciesPage(page)
    await vacanciesPage.selectAll()
    await vacanciesPage.exportVacanciesWithCheck('Software Engineer', 2000)
  })

  test('Archive a Vacancy', async ({ page }) => {
    const archiveVacancy: NewVacancy = {
      title: `Archive Vacancy-${generateId(4)}`,
      description: 'Vacancy description from Edit a Archive a Vacancy test',
      location: 'Archive a Vacancy location'
    }

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonVacancies.click()

    const vacanciesPage = new VacanciesPage(page)
    await vacanciesPage.createNewVacancy(archiveVacancy)
    await vacanciesPage.openVacancyByName(archiveVacancy.title)

    const vacancyDetailsPage = new VacancyDetailsPage(page)
    await vacancyDetailsPage.moreActionOn('Archive')
    await vacancyDetailsPage.pressYesForPopup(page)
    await vacancyDetailsPage.checkActivityExist('changed archived at')

    await navigationMenuPage.buttonVacancies.click()
    await vacanciesPage.checkVacancyNotExist(
      archiveVacancy.title,
      `Archieved vacancy "${archiveVacancy.title}" visible.`
    )

    await vacanciesPage.showArchivedVacancy()
    await vacanciesPage.checkVacancyExist(
      archiveVacancy.title,
      `Archieved vacancy "${archiveVacancy.title}" is not visible.`
    )
  })
})
