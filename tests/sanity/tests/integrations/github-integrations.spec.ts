import { test } from '@playwright/test'
import { LoginPage } from '../model/login-page'
import { StagingUser, StagingPass, StagingUrl } from '../utils'
import { CommonTrackerPage } from '../model/tracker/common-tracker-page'
import { SelectWorkspacePage } from '../model/select-workspace-page'
// import { GithubIntegration } from '../API/GithubIntegration'
// import { faker } from '@faker-js/faker'
import { UserProfilePage } from '../model/profile/user-profile-page'
import { SettingsPage, SettingsButtonType } from '../model/settings/settings'
// import { GitHubIntegrationPage } from '../model/integrations/github-integrations-page'

test.describe.skip('Github integrations ', () => {
  let loginPage: LoginPage
  let commonTrackerPage: CommonTrackerPage
  let userProfilePage: UserProfilePage
  let selectWorkspacePage: SelectWorkspacePage
  let settingsPage: SettingsPage
  //   let githubIntegrations: GithubIntegration
  //   let gitHubPage: GitHubIntegrationPage

  test.beforeEach(async ({ page, request }) => {
    loginPage = new LoginPage(page)
    commonTrackerPage = new CommonTrackerPage(page)
    userProfilePage = new UserProfilePage(page)
    selectWorkspacePage = new SelectWorkspacePage(page)
    settingsPage = new SettingsPage(page)
    // githubIntegrations = new GithubIntegration(request)
    // gitHubPage = new GitHubIntegrationPage(page)
    // const repoName = faker.word.words(1)
    // const issueTitle = faker.word.words(4)
    // const issueBody = faker.word.words(10)
    //   await githubIntegrations.createGitHubRepository(repoName)
    //   await githubIntegrations.createGitHubIssue(repoName, issueTitle, issueBody)
    await page.waitForTimeout(100)
    //   await githubIntegrations.deleteGitHubRepository(repoName)
    await page.goto(StagingUrl)
  })

  test('user can integrate using github', async ({ page }) => {
    await loginPage.login(StagingUser, StagingPass)
    await page.waitForTimeout(100)
    await selectWorkspacePage.selectWorkspace('GithubIntegrations')
    await commonTrackerPage.checkIfMainPanelIsVisible()
    await userProfilePage.openProfileMenu()
    await userProfilePage.clickSettings()
    await settingsPage.selectSettings(SettingsButtonType.Integrations)
    await gitHubPage.authorizeGitHub()
    await gitHubPage.installGitHubApp()
    await gitHubPage.completeGitHubIntegration()
  })
})
