// import { test } from '@playwright/test'
// // import { LoginPage } from '../model/login-page'
// import { StagingUrl } from '../utils'
// // import { CommonTrackerPage } from '../model/tracker/common-tracker-page'
// // import { SignUpPage } from '../model/signup-page'
// // import { TrackerNavigationMenuPage } from '../model/tracker/tracker-navigation-menu-page'
// // import { SelectWorkspacePage } from '../model/select-workspace-page'
// import { GithubIntegration } from '../API/GithubIntegration'
// import { faker } from '@faker-js/faker'

// test.describe('Github integrations @staging', () => {
//   let githubIntegrations: GithubIntegration

//   test.beforeEach(async ({ page, request }) => {
//     // loginPage = new LoginPage(page)
//     // commonTrackerPage = new CommonTrackerPage(page)
//     // signupPage = new SignUpPage(page)
//     // trackerNavigationMenuPage = new TrackerNavigationMenuPage(page)
//     // selectWorkspacePage = new SelectWorkspacePage(page)
//     githubIntegrations = new GithubIntegration(request)
//     const repoName = faker.word.words(1)
//     const issueTitle = faker.word.words(4)
//     const issueBody = faker.word.words(10)
//     await githubIntegrations.createGitHubRepository(repoName)
//     await githubIntegrations.createGitHubIssue(repoName, issueTitle, issueBody)

//     await (await page.goto(`${StagingUrl}`))?.finished()
//     await page.waitForTimeout(100)
//     await githubIntegrations.deleteGitHubRepository(repoName)
//   })

//   test('user can integrate using github @staging', async ({ page }) => {
//     //   await page.waitForTimeout(100)
//     //   await loginPage.login("testing.huly@gmail.com", 'Smagadu1989!')
//     //   await selectWorkspacePage.selectWorkspace('GithubIntegrations')
//     //   await commonTrackerPage.checkIfMainPanelIsVisible()
//     //   await page.waitForTimeout(100)
//     //   await page.locator('#profile-button div').first().click();
//     //   await page.getByText('Jasmin Music').click();
//     //   await page.getByRole('button', { name: 'Integrations' }).click();
//     //   await page.getByRole('button', { name: 'Add' }).nth(3).click();
//     //   const page1Promise = page.waitForEvent('popup');
//     //   await page.getByRole('button', { name: 'Re-authorize Huly GitHub App' }).click();
//     //   const page1 = await page1Promise;
//     //   await page1.getByLabel('Username or email address').click();
//     //   await page1.getByLabel('Username or email address').fill('testing.huly@gmail.com');
//     //   await page1.getByLabel('Password').click();
//     //   await page1.getByLabel('Password').fill('Smagadu1989!');
//     //   await page1.getByRole('button', { name: 'Sign in', exact: true }).click();
//     //   await page1.getByRole('button', { name: 'Authorize Huly GitHub Staging' }).click();
//     //   await page1.close();
//     //   await page.getByText('Github Repositories').click();
//     //   const page2Promise = page.waitForEvent('popup');
//     //   await page.getByRole('button', { name: 'Install Github App' }).click();
//     //   const page2 = await page2Promise;
//     //   await page2.getByRole('button', { name: 'Install' }).click();
//     //   await page2.close();
//     //   // await expect(page.locator('[id="github\\:string\\:GithubDesc"]')).toContainText('https://github.com/testingHuly (User)');
//     //   // await expect(page.getByRole('button', { name: 'Uninstall' })).toBeVisible();
//     //   await page.getByRole('button', { name: 'Ok' }).click();
//     //   await page.getByRole('button', { name: 'Configure' }).click();
//     //   await page.getByText('Github Repositories').click();
//     //   await page.getByRole('button', { name: 'Uninstall' }).click();
//     //   await page.getByRole('button', { name: 'Ok' }).nth(1).click();
//     //   await page.getByText('Your Github account').click();
//     //   await page.getByRole('button', { name: 'Ok' }).click();
//   })
// })
