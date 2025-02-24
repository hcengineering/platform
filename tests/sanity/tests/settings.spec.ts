import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI, generateId } from './utils'
import { UserProfilePage } from './model/profile/user-profile-page'
import { TemplatePage } from './model/tracker/templates-page'
import { SettingsPage } from './model/settings-page'
import { IssuesPage } from './model/tracker/issues-page'
import { TaskTypes } from './model/types'

test.use({
  storageState: PlatformSetting
})
test.describe('settings tests', () => {
  let userProfilePage: UserProfilePage
  let templatePage: TemplatePage
  let settingsPage: SettingsPage
  const platformUri = `${PlatformURI}/workbench/sanity-ws`
  const expectedProfileUrl = `${PlatformURI}/workbench/sanity-ws/setting/profile`

  test.beforeEach(async ({ page }) => {
    userProfilePage = new UserProfilePage(page)
    templatePage = new TemplatePage(page)
    settingsPage = new SettingsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('update-profile', async () => {
    await userProfilePage.gotoProfile(platformUri)
    await userProfilePage.openProfileMenu()
    await userProfilePage.selectProfileByName('Appleseed John')
    await userProfilePage.verifyProfilePageUrl(expectedProfileUrl)
    await userProfilePage.updateLocation('LoPlaza')
    await userProfilePage.addOrEditPhone()
    await userProfilePage.applyChanges()
  })

  test('create-template', async () => {
    await templatePage.navigateToWorkspace(platformUri)
    await templatePage.openProfileMenu()
    await templatePage.openSettings()
    await templatePage.goToNotifications()
    await templatePage.selectTextTemplates()
    await templatePage.createTemplate('t1', 'some text value')
    await templatePage.editTemplate('some more2 value')
  })

  test('add-task-types', async () => {
    const spaceName = `TT-${generateId(4)}`
    await settingsPage.navigateToWorkspace(platformUri)
    await settingsPage.openProfileMenu()
    await settingsPage.openSettings()
    await settingsPage.createSpaceType(spaceName, 'Tracker')
    await settingsPage.selectSpaceType(spaceName, 'Tracker')
    await settingsPage.addTaskType('Issue', TaskTypes.TaskAndSubtask)
    await settingsPage.checkTaskType('Issue', TaskTypes.TaskAndSubtask)
    await settingsPage.openTaskType('Issue', TaskTypes.TaskAndSubtask)
    await settingsPage.checkOpened(spaceName, 'Issue')
  })

  test('customize-task-types', async ({ page }) => {
    const taskTypeName = `Bug-${generateId(4)}`
    await settingsPage.navigateToWorkspace(platformUri)
    await settingsPage.openProfileMenu()
    await settingsPage.openSettings()
    await settingsPage.selectSpaceType('Default', 'Tracker')
    await settingsPage.addTaskType(taskTypeName, TaskTypes.TaskAndSubtask)
    await settingsPage.checkTaskType(taskTypeName, TaskTypes.TaskAndSubtask)
    await settingsPage.openTaskType(taskTypeName, TaskTypes.TaskAndSubtask)
    await settingsPage.checkOpened('Default', taskTypeName)
    await settingsPage.changeIcon()
    await settingsPage.checkState('Todo')
    await settingsPage.changeState('Todo', 'Needs Attention', 'Firework')
    await settingsPage.checkState('New state')
    await settingsPage.changeState('New state', 'Under Review', 'Sunshine')
    const issuesPage = new IssuesPage(page)
    await issuesPage.clickOnApplicationButton()
    await issuesPage.createAndOpenIssue('Minor bug', 'Appleseed John', 'Needs Attention', taskTypeName)
  })

  // TODO: Need rework.
  test.skip('manage-templates', async () => {
    await templatePage.navigateToWorkspace(platformUri)
    await templatePage.openProfileMenu()
    await templatePage.openSettings()
    await templatePage.goToNotifications()
    await templatePage.selectVacancies()

    // await page.getByRole('button', { name: 'Recruiting', exact: true }).click()
    // await page.locator('#navGroup-statuses').getByText('New Recruiting project type').first().click()

    // // Click #create-template div
    // await page.click('#create-template div')
    // const tid = 'template-' + generateId()
    // const t = page.locator('#templates div:has-text("New project type")').first()
    // await t.click()
    // await t.locator('input').fill(tid)
    // // await page.locator(`#templates >> .container:has-text("${tid}")`).type('Enter')

    // await page.locator('.states >> svg >> nth=1').click()
    // await page.locator('text=Rename').click()
    // await page.locator('.box > .antiEditBox input').fill('State1')
    // await page.locator('button:has-text("Save")').click()
    // await page.waitForSelector('form.antiCard', { state: 'detached' })
    // await page.click('text=STATUS >> div')
    // await page.locator('.box > .antiEditBox input').fill('State2')
    // await page.locator('button:has-text("Save")').click()
    // await page.waitForSelector('form.antiCard', { state: 'detached' })
    // await page.click('text=STATUS >> div')
    // await page.locator('.box > .antiEditBox input').fill('State3')
    // await page.locator('button:has-text("Save")').click()
    // await page.waitForSelector('form.antiCard', { state: 'detached' })
  })
})
