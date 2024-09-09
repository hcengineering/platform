import { test } from '@playwright/test'
import { ApiEndpoint } from '../API/Api'
import { ChannelPage } from '../model/channel-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { LoginPage } from '../model/login-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
import { PlatformURI, generateTestData, generateId } from '../utils'
import { LinkedChannelTypes } from '../model/types'
import { VacanciesPage } from '../model/recruiting/vacancies-page'
import { TalentsPage } from '../model/recruiting/talents-page'
import { TalentName } from '../model/recruiting/types'

test.describe('Dynamic reqruting chats', () => {
  let leftSideMenuPage: LeftSideMenuPage
  let channelPage: ChannelPage
  let vacanciesPage: VacanciesPage
  let talentsPage: TalentsPage
  let loginPage: LoginPage
  let api: ApiEndpoint
  let data: { workspaceName: string, userName: string, firstName: string, lastName: string, channelName: string }

  test.beforeEach(async ({ page, request }) => {
    data = generateTestData()

    leftSideMenuPage = new LeftSideMenuPage(page)
    channelPage = new ChannelPage(page)
    vacanciesPage = new VacanciesPage(page)
    talentsPage = new TalentsPage(page)
    loginPage = new LoginPage(page)

    api = new ApiEndpoint(request)
    await api.createAccount(data.userName, '1234', data.firstName, data.lastName)
    await api.createWorkspaceWithLogin(data.workspaceName, data.userName, '1234')
    await (await page.goto(`${PlatformURI}`))?.finished()
    await loginPage.login(data.userName, '1234')
    const swp = new SelectWorkspacePage(page)
    await swp.selectWorkspace(data.workspaceName)
  })

  test('User can work with a vacancy/talent/aplications and see linked chat', async () => {
    await leftSideMenuPage.clickRecruiting()
    const newVacancyTitle = `Vacancy ${generateId()}`
    let talentName: TalentName

    await test.step('Create vacancy', async () => {
      await vacanciesPage.createVacancy(newVacancyTitle)
    })

    await test.step('User has linked vacancy chat', async () => {
      await leftSideMenuPage.clickChunter()
      await channelPage.checkLinkedChannelIsExist(newVacancyTitle, LinkedChannelTypes.Vacancy)
    })

    await test.step('Prepare a talent', async () => {
      await leftSideMenuPage.clickRecruiting()
      await talentsPage.clickTalentsTab()
      talentName = await talentsPage.createNewTalent()
      await talentsPage.openTalentByTalentName(talentName)
    })

    await test.step('Create application', async () => {
      await talentsPage.clickAddApplication()
      await talentsPage.selectSpace()
      await talentsPage.searchAndSelectVacancy(newVacancyTitle)
      await talentsPage.waitForHRInterviewVisible()
      await talentsPage.createApplication()
      await talentsPage.clickVacancyApplication(newVacancyTitle)
      await talentsPage.assignRecruiter()
      await talentsPage.selectRecruterToAssignByName(`${data.lastName} ${data.firstName}`)
    })

    await test.step('User has linked application chat', async () => {
      await leftSideMenuPage.clickChunter()
      await channelPage.checkLinkedChannelIsExist(
        `${talentName.lastName} ${talentName.firstName}`,
        LinkedChannelTypes.Application
      )
    })
  })
})
