import { test } from '@playwright/test'
import { PlatformSetting, PlatformURI } from './utils'
import { UserProfilePage } from './model/profile/user-profile-page'
import { TemplatePage } from './model/tracker/templates-page'

test.use({
  storageState: PlatformSetting
})
test.describe('contact tests', () => {
  let userProfilePage: UserProfilePage
  let templatePage: TemplatePage
  const platformUri = `${PlatformURI}/workbench/sanity-ws`
  const expectedProfileUrl = `${PlatformURI}/workbench/sanity-ws/setting/profile`

  test.beforeEach(async ({ page }) => {
    userProfilePage = new UserProfilePage(page)
    templatePage = new TemplatePage(page)
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

  test('manage-templates', async () => {
    await templatePage.navigateToWorkspace(platformUri)
    await templatePage.openProfileMenu()
    await templatePage.openSettings()
    await templatePage.goToNotifications()
    await templatePage.selectVacancies()

    // TODO: Need rework.
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
