import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI, attachScreenshot } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { VacanciesPage } from '../model/recruiting/vacancies-page'
import { VacancyDetailsPage } from '../model/recruiting/vacancy-details-page'
import { NewVacancy } from '../model/recruiting/types'
import { SettingsPage } from '../model/settings-page'
import { WorkspaceSettingsPage } from '../model/workspace/workspace-settings-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Vacancy tests', () => {
  let navigationMenuPage: NavigationMenuPage
  let vacanciesPage: VacanciesPage
  let vacancyDetailsPage: VacancyDetailsPage

  test.beforeEach(async ({ page }) => {
    navigationMenuPage = new NavigationMenuPage(page)
    vacanciesPage = new VacanciesPage(page)
    vacancyDetailsPage = new VacancyDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create-vacancy', async ({ page }) => {
    await attachScreenshot('create-vacancy - start', page)
    const settingsPage: SettingsPage = new SettingsPage(page)
    await settingsPage.profileButton().click()
    await settingsPage.selectPopupAp('Settings')
    const wsPage: WorkspaceSettingsPage = new WorkspaceSettingsPage(page)
    await wsPage.owners().click()
    await settingsPage.checkOpened('Owners')
    await settingsPage.clickButtonRoleInComponent('Appleseed John')
    await settingsPage.selectPopupMenu('Owner').click()
    await attachScreenshot('create-vacancy - premissions', page)

    const vacancyId = 'My vacancy ' + generateId(4)
    await vacanciesPage.createVacancy(vacancyId)
    await vacanciesPage.modifyVacancy(vacancyId)
    await vacanciesPage.createApplicationVacencies('Alex')
  })

  test('use-kanban', async () => {
    await vacanciesPage.navigateToSoftwareEngineerVacancies()
    await vacanciesPage.selectApplicationsTab()
    await vacanciesPage.verifyApplicantsVisibility()

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
  })

  test('Edit a Vacancy', async () => {
    const vacancyName = 'Edit Vacancy ' + generateId(4)

    await navigationMenuPage.clickButtonVacancies()
    await vacanciesPage.createNewVacancy({
      title: vacancyName,
      description: 'Vacancy description from Edit a Vacancy test',
      location: 'Edit a Vacancy location'
    })
    await vacanciesPage.openVacancyByName(vacancyName)
    await vacancyDetailsPage.addComment('Test Vacancy Comment 12345')
    await vacancyDetailsPage.checkCommentExist('Test Vacancy Comment 12345')
    await vacancyDetailsPage.fillInputDescription('Edit a Vacancy description')
    await vacancyDetailsPage.checkIfInputDescriptionHasText('Edit a Vacancy description')
    await vacancyDetailsPage.addAttachments('cat.jpeg')
    await vacancyDetailsPage.addDescription('Vacancy Description left-side menu')
    await vacancyDetailsPage.addLocation('Edit Vacancy Location')
    await vacancyDetailsPage.addCompany('Apple')
    await vacancyDetailsPage.addDueDateToday()
  })

  test('Filter vacancies', async () => {
    // viable when test set of vacancies fits to single page
    const vacancyName = 'Archive Vacancy ' + generateId(5)
    await navigationMenuPage.clickButtonVacancies()
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
    await vacanciesPage.clickOnHideArchivedVacancies()
    await vacanciesPage.checkVacancyNotExist(
      vacancyName,
      `Archieved vacancy "${vacancyName}" not visible when hide archved back on.`
    )
  })

  test('Export vacancies', async () => {
    await navigationMenuPage.clickButtonVacancies()
    await vacanciesPage.selectAll()
    await vacanciesPage.exportVacanciesWithCheck('Software Engineer', 2000)
  })

  test('Archive a Vacancy', async ({ page }) => {
    const archiveVacancy: NewVacancy = {
      title: `Archive Vacancy-${generateId(4)}`,
      description: 'Vacancy description from Edit a Archive a Vacancy test',
      location: 'Archive a Vacancy location'
    }

    await navigationMenuPage.clickButtonVacancies()
    await vacanciesPage.createNewVacancy(archiveVacancy)
    await vacanciesPage.openVacancyByName(archiveVacancy.title)
    await vacancyDetailsPage.moreActionOn('Archive')
    await vacancyDetailsPage.pressYesForPopup(page)
    await vacancyDetailsPage.checkActivityExist('Archived set to Yes')
    await navigationMenuPage.clickButtonVacancies()
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
