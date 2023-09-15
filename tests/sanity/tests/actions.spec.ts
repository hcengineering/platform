import { expect, test } from '../src/fixtures/baseFixture'
import { PlatformSetting, PlatformURI } from '../src/utils/utils'

test.use({
  storageState: PlatformSetting
})

test.describe('actions tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and workspace
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/sanity-ws`))?.finished()
  })

  test('Add new candidate', async ({ page, authorizedMainPage, recruitPage }) => {
    await test.step(`Open recruit application`, async () => {
      await authorizedMainPage.leftSidebar.openRecruitApplication();
    });

    await test.step(`Open talents tab`, async () => {
      await recruitPage.recruitsPanel.openTalentsTab();
    });

    await test.step(`Check talents url`, async () => {
      await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)
    });

    await test.step(`Click on title "Frontend engineer" and open menu`, async () => {
      await recruitPage.talentsTab.openMenu("Frontend Engineer");
    });

    await test.step(`Fill search place`, async () => {
      await recruitPage.talentsTab.recruitsPopUp.enterValueInPlaceholder("Talent")
    });

    await test.step(`Check button "New Talent" is visible`, async () => {
      await expect(recruitPage.talentsTab.recruitsPopUp.newTalentButton()).toBeVisible();
    });

    await test.step(`Click on "New Talent" button`, async () => {
      await recruitPage.talentsTab.recruitsPopUp.openAddNewTalentForm();
    });

    await test.step(`Close popUp`, async () => {
      await recruitPage.talentsTab.recruitsPopUp.closePopUp();
    });
  })

  test('action-switch-vacancies', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await page.press('body', 'Meta+k')
    await page.fill('[placeholder="type\\ to\\ filter\\.\\.\\."]', 'go to')
    expect(await page.locator('div.selectPopup :text("Go To Vacancies")').count()).toBe(1)
    await page.click('div.selectPopup :text("Go To Vacancies")')

    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/vacancies`)
  })
  test('action-switch-applications', async ({ page }) => {
    await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')

    await page.click('text=Talents')
    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/talents`)

    await page.press('body', 'Meta+k')
    await page.fill('[placeholder="type\\ to\\ filter\\.\\.\\."]', 'go to')
    expect(await page.locator('div.selectPopup :text("Go To Applications")').count()).toBe(1)
    await page.click('div.selectPopup :text("Go To Applications")')

    await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/recruit/candidates`)
  })
})
