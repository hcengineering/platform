import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { RecruitingPage } from '../model/recruiting/recruiting-page'
import { CommonRecruitingPage } from '../model/recruiting/common-recruiting-page'

test.use({
  storageState: PlatformSetting
})

test.describe('review tests', () => {
  let recruitingPage: RecruitingPage
  let commonRecruitingPage: CommonRecruitingPage

  test.beforeEach(async ({ page }) => {
    recruitingPage = new RecruitingPage(page)
    commonRecruitingPage = new CommonRecruitingPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create-review', async ({ page }) => {
    const reviewId = 'review-' + generateId()
    await recruitingPage.clickOnReviews()
    await recruitingPage.clickOnReviewButton()
    await commonRecruitingPage.clickOnTitle()
    await commonRecruitingPage.fillTitle(reviewId)
    await commonRecruitingPage.clickAppleseedJohn()
    await commonRecruitingPage.clickChenRosamund()
    await commonRecruitingPage.pressEscapeInSearch()
    await commonRecruitingPage.clickTalent()
    // Click button:has-text("Chen Rosamund")
    await commonRecruitingPage.clickChenRosamund()
    await commonRecruitingPage.createApplication()
    await commonRecruitingPage.selectReviewItem(reviewId)
    await commonRecruitingPage.clickTwoMembers()
    await commonRecruitingPage.clickAppleseedJohn()
    // ADD ASSERTION
  })
})
