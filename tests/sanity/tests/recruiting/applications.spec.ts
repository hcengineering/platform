import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { ApplicationsPage } from '../model/recruiting/applications-page'
import { ApplicationsDetailsPage } from '../model/recruiting/applications-details-page'
import { VacancyDetailsPage } from '../model/recruiting/vacancy-details-page'
import { VacanciesPage } from '../model/recruiting/vacancies-page'
import { TalentsPage } from '../model/recruiting/talents-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Application tests', () => {
  let vacanciesPage: VacanciesPage
  let vacancyDetailsPage: VacancyDetailsPage
  let navigationMenuPage: NavigationMenuPage
  let talentsPage: TalentsPage
  let applicationsDetailsPage: ApplicationsDetailsPage
  let applicationsPage: ApplicationsPage

  test.beforeEach(async ({ page }) => {
    vacanciesPage = new VacanciesPage(page)
    vacancyDetailsPage = new VacancyDetailsPage(page)
    navigationMenuPage = new NavigationMenuPage(page)
    talentsPage = new TalentsPage(page)
    applicationsDetailsPage = new ApplicationsDetailsPage(page)
    applicationsPage = new ApplicationsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create application', async ({ page }) => {
    const vacancyId = 'My vacancy ' + generateId(4)
    await page.waitForLoadState('load')
    await vacanciesPage.clickOnVacancy()
    await vacanciesPage.clickOnVacancyButton()
    await vacanciesPage.fillSoftwareEngineerInput(vacancyId)
    await vacanciesPage.clickOnVacanciesCreateButton()
    await vacanciesPage.openVacancyByName(vacancyId)
    await vacancyDetailsPage.checkIfVacancyInputComentIsVisible()
    await navigationMenuPage.clickButtonTalents()
    await talentsPage.clickOnAndreyTalet()

    // Click on Add button
    // await page.click('.applications-container .flex-row-center .flex-center')
    await talentsPage.clickAddApplication()
    await talentsPage.selectSpace()
    await talentsPage.searchAndSelectVacancy(vacancyId)
    await talentsPage.waitForHRInterviewVisible()
    // We need to be sure state is proper one, no other way to do it.
    await page.waitForTimeout(100)
    await talentsPage.createApplication()

    await talentsPage.clickVacancyApplication(vacancyId)
    await talentsPage.assignRecruiter()
    await talentsPage.selectChenRosamund()
    // ADD ASSERTION HERE
  })

  test.skip('Edit an Application', async ({ page }) => {
    const vacancyName = 'Edit an Application Vacancy ' + generateId(4)
    await navigationMenuPage.clickButtonVacancies()
    await vacanciesPage.createNewVacancy({
      title: vacancyName,
      description: 'Vacancy description from Edit a Vacancy test',
      location: 'Edit a Vacancy location'
    })
    await navigationMenuPage.clickButtonApplications()
    const talentName = await applicationsPage.createNewApplicationWithNewTalent({
      vacancy: vacancyName,
      recruiterName: 'first'
    })
    await applicationsPage.openApplicationByTalentName(talentName)
    await applicationsDetailsPage.addComment('Test Comment 123')
    await applicationsDetailsPage.checkCommentExist('Test Comment 123')
    await applicationsDetailsPage.addAttachments('cat.jpeg')
    await applicationsDetailsPage.addFirstReview('First Application Review', 'First Application review description')
  })

  test('Change Done status', async ({ page }) => {
    await navigationMenuPage.clickButtonApplications()

    const talentName = await applicationsPage.createNewApplicationWithNewTalent({
      vacancy: 'first',
      recruiterName: 'first'
    })
    await applicationsPage.openApplicationByTalentName(talentName)
    await applicationsDetailsPage.changeState('Lost')
    await navigationMenuPage.clickButtonMyApplications()
    await applicationsPage.clickButtonTabCreated()
    await applicationsPage.checkApplicationState(talentName, 'Lost')
    await applicationsPage.openApplicationByTalentName(talentName)
    await applicationsDetailsPage.changeState('Won')
    await navigationMenuPage.clickButtonMyApplications()
    await applicationsPage.clickButtonTabCreated()
    await applicationsPage.checkApplicationState(talentName, 'Won')
  })

  test('Delete an Application', async ({ page }) => {
    await navigationMenuPage.clickButtonApplications()
    const talentName = await applicationsPage.createNewApplicationWithNewTalent({
      vacancy: 'first',
      recruiterName: 'first'
    })
    await applicationsPage.openApplicationByTalentName(talentName)
    const applicationId = await applicationsDetailsPage.getApplicationId()
    await applicationsDetailsPage.deleteEntity()
    await navigationMenuPage.clickButtonApplications()
    await applicationsPage.checkApplicationNotExist(applicationId)
  })

  test('Change & Save all States', async ({ page }) => {
    await navigationMenuPage.clickButtonApplications()

    const talentName = await applicationsPage.createNewApplicationWithNewTalent({
      vacancy: 'first',
      recruiterName: 'first'
    })
    await applicationsPage.checkApplicationState(talentName, 'Backlog')
    await applicationsPage.openApplicationByTalentName(talentName)
    await applicationsDetailsPage.changeState('Technical Interview')
    await navigationMenuPage.clickButtonApplications()
    await applicationsPage.checkApplicationState(talentName, 'Technical Interview')
    await applicationsPage.changeApplicationStatus(talentName, 'Test task')
    await applicationsPage.checkApplicationState(talentName, 'Test task')
    await applicationsPage.openApplicationByTalentName(talentName)
    await applicationsDetailsPage.changeState('Offer')
  })

  test('Comment stored after reload the page', async ({ page }) => {
    const commentText = `Application comment should be stored after reload-${generateId()}`
    const vacancyName = 'Comment stored Vacancy ' + generateId(4)

    await navigationMenuPage.clickButtonVacancies()
    await vacanciesPage.createNewVacancy({
      title: vacancyName,
      description: 'Vacancy description from Edit a Vacancy test',
      location: 'Edit a Vacancy location'
    })
    await navigationMenuPage.clickButtonApplications()
    const talentName = await applicationsPage.createNewApplicationWithNewTalent({
      vacancy: 'first',
      recruiterName: 'first'
    })
    await applicationsPage.openApplicationByTalentName(talentName)
    const applicationId = await applicationsDetailsPage.getApplicationId()
    await applicationsDetailsPage.addComment(commentText)
    await applicationsDetailsPage.checkCommentExist(commentText)
    await page.reload()
    await applicationsDetailsPage.waitApplicationDetailsOpened(applicationId)
    await applicationsDetailsPage.checkCommentExist(commentText)
  })
})
