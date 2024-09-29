import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../../utils'
import { NavigationMenuPage } from '../../model/recruiting/navigation-menu-page'
import { VacanciesPage } from '../../model/recruiting/vacancies-page'
import { VacancyDetailsPage } from '../../model/recruiting/vacancy-details-page'
import { NewVacancy } from '../../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Recruiting. Vacancy tests', () => {
  let navigationMenuPage: NavigationMenuPage
  let vacanciesPage: VacanciesPage
  let vacancyDetailsPage: VacancyDetailsPage

  test.beforeEach(async ({ page }) => {
    navigationMenuPage = new NavigationMenuPage(page)
    vacanciesPage = new VacanciesPage(page)
    vacancyDetailsPage = new VacancyDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('Create a Vacancy', async () => {
    const vacancyId = 'My vacancy ' + generateId(4)
    await vacanciesPage.createVacancy(vacancyId)
    await vacanciesPage.modifyVacancy(vacancyId)
    await vacanciesPage.createApplicationVacencies('Alex')
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
    await vacanciesPage.checkVacancyNotExist(archiveVacancy.title)
    await vacanciesPage.showArchivedVacancy()
    await vacanciesPage.checkVacancyExist(archiveVacancy.title)
  })
})
