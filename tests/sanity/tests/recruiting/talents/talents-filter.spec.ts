import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../../utils'
import { LeftSideMenuPage } from '../../model/left-side-menu-page'
import { TalentsPage } from '../../model/recruiting/talents-page'
import { TalentDetailsPage } from '../../model/recruiting/talent-details-page'
import { DateDivided } from '../../model/types'
import { TalentName } from '../../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('Recruiting. Talents filters tests', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let talentsPage: TalentsPage
  let talentDetailsPage: TalentDetailsPage
  let talentName: TalentName

  test.beforeEach(async ({ page }) => {
    leftSideMenuPage = new LeftSideMenuPage(page)
    talentsPage = new TalentsPage(page)
    talentDetailsPage = new TalentDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()

    await leftSideMenuPage.clickRecruiting()
    await talentsPage.clickTalentsTab()
  })

  test('Filter by Modified date: Today', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Modified date', 'Today')
    await talentsPage.checkFilter('Modified date', 'Today')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Modified date: Yesterday', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Modified date', 'Yesterday')
    await talentsPage.checkFilter('Modified date', 'Yesterday')

    await talentsPage.checkTalentNotExist(talentName)
  })

  test('Filter by Modified date: This week', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Modified date', 'This week')
    await talentsPage.checkFilter('Modified date', 'This week')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Modified date: This month', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Modified date', 'This month')
    await talentsPage.checkFilter('Modified date', 'This month')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Modified date: Exact Today', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Modified date', 'Today')
    await talentsPage.updateFilterDimension('Exact date', 'Today')
    await talentsPage.checkFilter('Modified date', 'is', 'Today')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Modified date: Before Today', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Modified date', 'Today')
    await talentsPage.updateFilterDimension('Before date', 'Today')
    await talentsPage.checkFilter('Modified date', 'Before', 'Today')

    await talentsPage.checkTalentNotExist(talentName)
  })

  test('Filter by Modified date: After Today', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Modified date', 'Today')
    await talentsPage.updateFilterDimension('After date', 'Today')
    await talentsPage.checkFilter('Modified date', 'After', 'Today')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Modified date: Between dates', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Modified date', 'Today')
    await talentsPage.updateFilterDimension('Between dates')

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

    await talentsPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
    await talentsPage.checkFilter('Modified date', 'is between', dateYesterday.getDate().toString())
    await talentsPage.checkFilter('Modified date', 'is between', dateTomorrow.getDate().toString())

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Created date: Today', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Created date', 'Today')
    await talentsPage.checkFilter('Created date', 'Today')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Created date: Yesterday', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Created date', 'Yesterday')
    await talentsPage.checkFilter('Created date', 'Yesterday')

    await talentsPage.checkTalentNotExist(talentName)
  })

  test('Filter by Created date: This week', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Created date', 'This week')
    await talentsPage.checkFilter('Created date', 'This week')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Created date: This month', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Created date', 'This month')
    await talentsPage.checkFilter('Created date', 'This month')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Created date: Exact Today', async () => {
    talentName = await talentsPage.createNewTalent()
    await talentsPage.selectFilter('Created date', 'Today')
    await talentsPage.updateFilterDimension('Exact date', 'Today')
    await talentsPage.checkFilter('Created date', 'is', 'Today')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Created date: Before Today', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Created date', 'Today')
    await talentsPage.updateFilterDimension('Before date', 'Today')
    await talentsPage.checkFilter('Created date', 'Before', 'Today')

    await talentsPage.checkTalentNotExist(talentName)
  })

  test('Filter by Created date: After Today', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Created date', 'Today')
    await talentsPage.updateFilterDimension('After date', 'Today')
    await talentsPage.checkFilter('Created date', 'After', 'Today')

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Created date: Between dates', async () => {
    talentName = await talentsPage.createNewTalent()

    await talentsPage.selectFilter('Created date', 'Today')
    await talentsPage.updateFilterDimension('Between dates')

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

    await talentsPage.fillBetweenDate(dateYesterdayDivided, dateTomorrowDivided)
    await talentsPage.checkFilter('Created date', 'is between', dateYesterday.getDate().toString())
    await talentsPage.checkFilter('Created date', 'is between', dateTomorrow.getDate().toString())

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Name', async () => {
    talentName = await talentsPage.createNewTalent()
    const unexpectedName = generateId()

    await talentsPage.selectFilter('Name', unexpectedName)
    await talentsPage.checkFilter('Name', 'contains', unexpectedName)

    await expect(talentsPage.linesFromTable()).toHaveCount(0)

    await talentsPage.buttonClearFilters().click()

    await talentsPage.selectFilter('Name', talentName.firstName)
    await talentsPage.checkFilter('Name', 'contains', talentName.firstName)

    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Contact Info: Phone', async () => {
    talentName = await talentsPage.createNewTalent()
    const phone = generateId()

    await talentsPage.selectFilter('Contact Info', 'Phone')
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentNotExist(talentName)
    await talentsPage.buttonClearFilters().click()
    await talentsPage.checkTalentExist(talentName)

    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.openAddSocialLinksPopup('Phone', phone)
    await talentDetailsPage.checkSocialLinks('Phone', phone)

    await talentsPage.clickTalentsTab()
    await talentsPage.selectFilter('Contact Info', 'Phone')
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Contact Info: Email', async () => {
    talentName = await talentsPage.createNewTalent()
    const email = `filter-${generateId()}@test.com`

    await talentsPage.selectFilter('Contact Info', 'Email')
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentNotExist(talentName)
    await talentsPage.buttonClearFilters().click()
    await talentsPage.checkTalentExist(talentName)

    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.openAddSocialLinksPopup('Email', email)
    await talentDetailsPage.checkSocialLinks('Email', email)

    await talentsPage.clickTalentsTab()
    await talentsPage.selectFilter('Contact Info', 'Email')
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Contact Info: Github URL', async () => {
    talentName = await talentsPage.createNewTalent()
    const github = `https://github.com/${generateId()}`
    await talentsPage.checkTalentExist(talentName)

    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.openAddSocialLinksPopup('Github', github)
    await talentDetailsPage.checkSocialLinks('Github', github)

    await talentsPage.clickTalentsTab()
    await talentsPage.selectFilter('Contact Info', 'GitHub')
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentExist(talentName)
  })

  test.only('Filter by "Created by"', async () => {
    talentName = await talentsPage.createNewTalent()
    const createdBy = 'Appleseed John'
    const createdByInitials = 'AJ'

    await talentsPage.selectFilter('Created by', createdBy)
    await talentsPage.inputSearch().press('Escape')

    await talentsPage.checkFilterWithInitials('Created by', 'is', createdByInitials)
    await talentsPage.checkTalentExist(talentName)
  })

  test.only('Filter by "Modified by"', async () => {
    talentName = await talentsPage.createNewTalent()
    const modifiedBy = 'Appleseed John'
    const modifiedByInitials = 'AJ'

    await talentsPage.selectFilter('Modified by', modifiedBy)
    await talentsPage.inputSearch().press('Escape')

    await talentsPage.checkFilterWithInitials('Modified by', 'is', modifiedByInitials)
    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Title', async () => {
    talentName = await talentsPage.createNewTalent()
    const talentTitle = `Title ${generateId()}`

    await talentsPage.checkTalentExist(talentName)

    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.addTitle(talentTitle)

    await talentsPage.clickTalentsTab()
    await talentsPage.selectFilter('Title', talentTitle)
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Source', async () => {
    talentName = await talentsPage.createNewTalent()
    const talentSource = `Source ${generateId()}`

    await talentsPage.checkTalentExist(talentName)

    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.addSource(talentSource)

    await talentsPage.clickTalentsTab()
    await talentsPage.selectFilter('Source', talentSource)
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentExist(talentName)
  })

  test('Filter by Location', async () => {
    talentName = await talentsPage.createNewTalent()
    const location = `Location ${generateId()}`

    await talentsPage.checkTalentExist(talentName)

    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.enterLocation(location)

    await talentsPage.clickTalentsTab()
    await talentsPage.selectFilter('Location', location)
    await talentsPage.page.keyboard.press('Escape')
    await talentsPage.checkTalentExist(talentName)
  })
})
