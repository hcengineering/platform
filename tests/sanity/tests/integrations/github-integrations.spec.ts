import { test } from '@playwright/test'
// import { LoginPage } from '../model/login-page'
import { StagingUrl } from '../utils'
// import { CommonTrackerPage } from '../model/tracker/common-tracker-page'
// import { SignUpPage } from '../model/signup-page'
// import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
// import { SelectWorkspacePage } from '../model/select-workspace-page'
// import { GithubIntegration } from '../API/GithubIntegration'
// import { faker } from '@faker-js/faker'

test.describe('Github integrations @staging', () => {
  //   let githubIntegrations: GithubIntegration

  test.beforeEach(async ({ page, request }) => {
    // loginPage = new LoginPage(page)
    // commonTrackerPage = new CommonTrackerPage(page)
    // signupPage = new SignUpPage(page)
    // trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
    // selectWorkspacePage = new SelectWorkspacePage(page)
    // githubIntegrations = new GithubIntegration(request)
    // const repoName = faker.word.words(1)
    // const issueTitle = faker.word.words(4)
    // const issueBody = faker.word.words(10)
    // await githubIntegrations.createGitHubRepository(repoName)
    // await githubIntegrations.createGitHubIssue(repoName, issueTitle, issueBody)

    await (await page.goto(`${StagingUrl}`))?.finished()
    await page.waitForTimeout(100)
    // await githubIntegrations.deleteGitHubRepository(repoName)
  })

  test('user can integrate using github @staging', async ({ page }) => {})
})
