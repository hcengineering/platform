import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { TalentsPage } from '../model/recruiting/talents-page'
import { TalentDetailsPage } from '../model/recruiting/talent-details-page'
import { TalentName } from '../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('candidate/talents tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create-candidate', async ({ page, context }) => {
    await page.locator('[id="app-recruit\\:string\\:RecruitApplication"]').click()

    await page.click('text=Talents')

    await page.click('button:has-text("New Talent")')

    const first = 'Elton-' + generateId(4)
    const last = 'John-' + generateId(4)
    const loc = 'Cupertino'
    const email = `ej-${generateId(4)}@test.com`

    const firstName = page.locator('[placeholder="First name"]')
    await firstName.click()
    await firstName.fill(first)

    const lastName = page.locator('[placeholder="Last name"]')
    await lastName.click()
    await lastName.fill(last)

    const title = page.locator('[placeholder="Title"]')
    await title.click()
    await title.fill('Super Candidate')

    const location = page.locator('[placeholder="Location"]')
    await location.click()
    await location.fill(loc)

    await page.locator('[id="presentation\\:string\\:AddSocialLinks"]').click()
    await page.locator('.antiPopup').locator('text=Email').click()
    const emailInput = page.locator('[placeholder="john\\.appleseed@apple\\.com"]')
    await emailInput.fill(email)
    await page.locator('#channel-ok.antiButton').click()

    await page.locator('.antiCard button:has-text("Create")').click()
    await page.waitForSelector('form.antiCard', { state: 'detached' })

    await page.click(`text="${last} ${first}"`)

    await expect(page.locator(`text=${first}`).first()).toBeVisible()
    await expect(page.locator(`text=${last}`).first()).toBeVisible()
    await expect(page.locator(`text=${loc}`).first()).toBeVisible()

    const panel = page.locator('.popupPanel')
    await panel.locator('[id="gmail\\:string\\:Email"]').scrollIntoViewIfNeeded()
    await panel.locator('[id="gmail\\:string\\:Email"]').click()
    expect(await page.locator('.cover-channel >> input').inputValue()).toEqual(email)
  })

  test('Edit the Talent', async ({ page, context }) => {
    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonTalents.click()

    const talentsPage = new TalentsPage(page)
    const talentName = await talentsPage.createNewTalent()

    await talentsPage.openTalentByTalentName(talentName)

    const talentDetailsPage = new TalentDetailsPage(page)
    await talentDetailsPage.addComment('Test Talent Detail 123')
    await talentDetailsPage.checkCommentExist('Test Talent Detail 123')

    await talentDetailsPage.addAttachments('cat.jpeg')

    await talentDetailsPage.addFirstReview('First Talent Review', 'First Talent review description')

    const skillTag = `React-${generateId(4)}`
    await talentDetailsPage.addSkill(skillTag, 'Description Java from Talent Description page')
    await talentDetailsPage.checkSkill(skillTag)

    await talentDetailsPage.addSocialLinks('Phone', '123123213213')
    await talentDetailsPage.checkSocialLinks('Phone', '123123213213')

    await talentDetailsPage.inputLocation.fill('Awesome Location')
    const title = `Title-${generateId(4)}`
    await talentDetailsPage.addTitle(title)
  })

  test('Delete the Talent', async ({ page, context }) => {
    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonTalents.click()

    const talentsPage = new TalentsPage(page)
    const talentName = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentName)

    const talentDetailsPage = new TalentDetailsPage(page)
    await talentDetailsPage.inputLocation.fill('Awesome Location')
    await talentDetailsPage.deleteEntity()

    await navigationMenuPage.buttonTalents.click()
    await talentsPage.checkTalentNotExist(talentName)
  })

  test('Merge contacts', async ({ page, context }) => {
    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonTalents.click()
    const talentsPage = new TalentsPage(page)

    // talent1
    const talentNameFirst = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentNameFirst)
    let talentDetailsPage = new TalentDetailsPage(page)
    await talentDetailsPage.inputLocation.fill('Awesome Location Merge1')
    const titleTalent1 = 'TitleMerge1'
    await talentDetailsPage.addTitle(titleTalent1)
    const sourceTalent1 = 'SourceTalent1'
    await talentDetailsPage.addSource(sourceTalent1)
    await talentDetailsPage.addSocialLinks('Phone', '123123213213')
    await talentDetailsPage.checkSocialLinks('Phone', '123123213213')

    // talent 2
    await navigationMenuPage.buttonTalents.click()
    const talentNameSecond = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentNameSecond)
    talentDetailsPage = new TalentDetailsPage(page)
    await talentDetailsPage.inputLocation.fill('Awesome Location Merge2')
    const titleTalent2 = 'TitleMerge2'
    await talentDetailsPage.addTitle(titleTalent2)
    const sourceTalent2 = 'SourceTalent2'
    await talentDetailsPage.addSource(sourceTalent2)
    await talentDetailsPage.addSocialLinks('Email', 'test-merge-2@gmail.com')
    await talentDetailsPage.checkSocialLinks('Email', 'test-merge-2@gmail.com')

    // merge
    await navigationMenuPage.buttonTalents.click()
    await talentsPage.openTalentByTalentName(talentNameFirst)

    await talentDetailsPage.mergeContacts({
      finalContactName: talentNameSecond.lastName,
      name: `${talentNameFirst.lastName} ${talentNameFirst.firstName}`,
      mergeLocation: true,
      location: 'Awesome Location Merge1',
      mergeTitle: true,
      title: titleTalent1,
      mergeSource: true,
      source: sourceTalent1
    })

    await navigationMenuPage.buttonTalents.click()
    await talentsPage.searchTalentByTalentName(talentNameFirst)
    await talentsPage.openTalentByTalentName(talentNameFirst)
    await talentDetailsPage.checkSocialLinks('Phone', '123123213213')
    await talentDetailsPage.checkSocialLinks('Email', 'test-merge-2@gmail.com')
    await expect(talentDetailsPage.inputLocation).toHaveValue('Awesome Location Merge1')
    await expect(talentDetailsPage.page.locator('button > span', { hasText: titleTalent2 })).toBeVisible()
    await expect(talentDetailsPage.page.locator('button > span', { hasText: sourceTalent2 })).toBeVisible()
  })

  test('Match to vacancy', async ({ page, context }) => {
    const talentName: TalentName = {
      firstName: 'Software',
      lastName: `Engineer-${generateId(4)}`
    }

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonTalents.click()

    const talentsPage = new TalentsPage(page)
    await talentsPage.createNewTalentWithName(talentName.firstName, talentName.lastName)

    await talentsPage.rightClickAction(talentName, 'Match to vacancy')
    await talentsPage.checkMatchVacancy(`${talentName.lastName} ${talentName.firstName}`, '0')
  })
})
