import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../../utils'
import { VacanciesPage } from '../../model/recruiting/vacancies-page'
import { VacancyDetailsPage } from '../../model/recruiting/vacancy-details-page'
// import { NewVacancy } from '../../model/recruiting/types'
import { LeftSideMenuPage } from '../../model/left-side-menu-page'
import { DateDivided } from '../../model/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Recruiting. Vacancies filters tests', () => {
  let vacanciesPage: VacanciesPage
  let vacancyDetailsPage: VacancyDetailsPage
  let leftSideMenuPage: LeftSideMenuPage
  let name: string

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    vacanciesPage = new VacanciesPage(page)
    vacancyDetailsPage = new VacancyDetailsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()

    await leftSideMenuPage.clickRecruiting()
    await vacanciesPage.openVacancies()
  })

  test('Filter by Modified date: Today', async () => {
    name = await vacanciesPage.createVacancy()
    await vacanciesPage.selectFilter('Modified date', 'Today')
    await vacanciesPage.checkFilter('Modified date', 'Today')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Modified date: Yesterday', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'Yesterday')
    await vacanciesPage.checkFilter('Modified date', 'Yesterday')

    await vacanciesPage.checkVacancyNotExist(name)
  })

  test('Filter by Modified date: This week', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'This week')
    await vacanciesPage.checkFilter('Modified date', 'This week')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Modified date: This month', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'This month')
    await vacanciesPage.checkFilter('Modified date', 'This month')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Modified date: Exact Today', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'Today')
    await vacanciesPage.updateFilterDimension('Exact date', 'Today')
    await vacanciesPage.checkFilter('Modified date', 'is', 'Today')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Modified date: Before Today', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'Today')
    await vacanciesPage.updateFilterDimension('Before date', 'Today')
    await vacanciesPage.checkFilter('Modified date', 'Before', 'Today')

    await vacanciesPage.checkVacancyNotExist(name)
  })

  test('Filter by Modified date: After Today', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'Today')
    await vacanciesPage.updateFilterDimension('After date', 'Today')
    await vacanciesPage.checkFilter('Modified date', 'After', 'Today')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Modified date: Between dates', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Modified date', 'Today')
    await vacanciesPage.updateFilterDimension('Between dates')

    const dateYesterday = new Date()
    dateYesterday.setDate(dateYesterday.getDate() - 1)

    const dateTomorrow = new Date()
    dateTomorrow.setDate(dateTomorrow.getDate() + 1)

    const dateYesterdayDivided: DateDivided = {
      day: dateYesterday.getDate().toString(),
      month: (dateYesterday.getMonth() + 1).toString(),
      year: dateYesterday.getFullYear().toString()
    }

    const dateTomorrowDivided: DateDivided = {
      day: dateTomorrow.getDate().toString(),
      month: (dateTomorrow.getMonth() + 1).toString(),
      year: dateTomorrow.getFullYear().toString()
    }

    await vacanciesPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
    await vacanciesPage.checkFilter('Modified date', 'is between', dateYesterday.getDate().toString())
    await vacanciesPage.checkFilter('Modified date', 'is between', dateTomorrow.getDate().toString())

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Created date: Today', async () => {
    name = await vacanciesPage.createVacancy()
    await vacanciesPage.selectFilter('Created date', 'Today')
    await vacanciesPage.checkFilter('Created date', 'Today')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Created date: Yesterday', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Created date', 'Yesterday')
    await vacanciesPage.checkFilter('Created date', 'Yesterday')

    await vacanciesPage.checkVacancyNotExist(name)
  })

  test('Filter by Created date: This week', async () => {
    name = await vacanciesPage.createVacancy()
    await vacanciesPage.selectFilter('Created date', 'This week')
    await vacanciesPage.checkFilter('Created date', 'This week')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Created date: This month', async () => {
    name = await vacanciesPage.createVacancy()
    await vacanciesPage.selectFilter('Created date', 'This month')
    await vacanciesPage.checkFilter('Created date', 'This month')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Created date: Exact Today', async () => {
    name = await vacanciesPage.createVacancy()
    await vacanciesPage.selectFilter('Created date', 'Today')
    await vacanciesPage.updateFilterDimension('Exact date', 'Today')
    await vacanciesPage.checkFilter('Created date', 'is', 'Today')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Created date: Before Today', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Created date', 'Today')
    await vacanciesPage.updateFilterDimension('Before date', 'Today')
    await vacanciesPage.checkFilter('Created date', 'Before', 'Today')

    await vacanciesPage.checkVacancyNotExist(name)
  })

  test('Filter by Created date: After Today', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Created date', 'Today')
    await vacanciesPage.updateFilterDimension('After date', 'Today')
    await vacanciesPage.checkFilter('Created date', 'After', 'Today')

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Created date: Between dates', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.selectFilter('Created date', 'Today')
    await vacanciesPage.updateFilterDimension('Between dates')

    const dateYesterday = new Date()
    dateYesterday.setDate(dateYesterday.getDate() - 1)

    const dateTomorrow = new Date()
    dateTomorrow.setDate(dateTomorrow.getDate() + 1)

    const dateYesterdayDivided: DateDivided = {
      day: dateYesterday.getDate().toString(),
      month: (dateYesterday.getMonth() + 1).toString(),
      year: dateYesterday.getFullYear().toString()
    }

    const dateTomorrowDivided: DateDivided = {
      day: dateTomorrow.getDate().toString(),
      month: (dateTomorrow.getMonth() + 1).toString(),
      year: dateTomorrow.getFullYear().toString()
    }

    await vacanciesPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
    await vacanciesPage.checkFilter('Created date', 'is between', dateYesterday.getDate().toString())
    await vacanciesPage.checkFilter('Created date', 'is between', dateTomorrow.getDate().toString())

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by "Created by"', async () => {
    name = await vacanciesPage.createVacancy()
    const createdBy = 'Appleseed John'
    const createdByInitials = 'AJ'

    await vacanciesPage.selectFilter('Created by', createdBy)
    await vacanciesPage.inputSearch().press('Escape')

    await vacanciesPage.checkFilterWithInitials('Created by', 'is', createdByInitials)
    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by "Modified by"', async () => {
    name = await vacanciesPage.createVacancy()
    const modifiedBy = 'Appleseed John'
    const modifiedByInitials = 'AJ'

    await vacanciesPage.selectFilter('Modified by', modifiedBy)
    await vacanciesPage.inputSearch().press('Escape')

    await vacanciesPage.checkFilterWithInitials('Modified by', 'is', modifiedByInitials)
    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Name', async () => {
    name = await vacanciesPage.createVacancy()
    const unexpectedName = generateId()

    await vacanciesPage.selectFilter('Name', unexpectedName)
    await vacanciesPage.checkFilter('Name', 'contains', unexpectedName)

    await expect(vacanciesPage.linesFromTable()).toHaveCount(0)

    await vacanciesPage.buttonClearFilters().click()

    await vacanciesPage.selectFilter('Name', name)
    await vacanciesPage.checkFilter('Name', 'contains', name)

    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Location', async () => {
    name = await vacanciesPage.createVacancy()
    const location = 'Moscow'

    await vacanciesPage.openVacancyByName(name)
    await vacancyDetailsPage.addLocation(location)

    await vacanciesPage.openVacancies()
    await vacanciesPage.selectFilter('Location', location)
    await vacanciesPage.page.keyboard.press('Escape')
    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Members', async () => {
    name = await vacanciesPage.createVacancy()
    const secondMember = 'Chen Rosamund'

    await vacanciesPage.selectFilter('Members', secondMember)
    await vacanciesPage.page.keyboard.press('Escape')
    await vacanciesPage.checkVacancyNotExist(name)

    await vacanciesPage.buttonClearFilters().click()

    await vacanciesPage.openVacancyByName(name)
    await vacancyDetailsPage.addMember(secondMember)

    await vacanciesPage.openVacancies()
    await vacanciesPage.selectFilter('Members', secondMember)
    await vacanciesPage.page.keyboard.press('Escape')
    await vacanciesPage.checkVacancyExist(name)
  })

  test('Filter by Archive', async () => {
    name = await vacanciesPage.createVacancy()

    await vacanciesPage.checkVacancyExist(name)
    await vacanciesPage.archiveVacancyByName(name)
    await vacanciesPage.checkVacancyNotExist(name)
    await vacanciesPage.showArchivedVacancy()
    await vacanciesPage.checkVacancyExist(name)
    await vacanciesPage.clickOnHideArchivedVacancies()
    await vacanciesPage.checkVacancyNotExist(name)
  })
})
