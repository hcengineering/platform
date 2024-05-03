import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from './utils'
import { TalentsPage } from './model/recruiting/talents-page'
import { faker } from '@faker-js/faker'

test.use({
  storageState: PlatformSetting
})

test.describe('recruit tests', () => {
  let talentPage: TalentsPage

  test.beforeEach(async ({ page }) => {
    talentPage = new TalentsPage(page)
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws`))?.finished()
  })

  test('create-skill-candidate-with-skill', async () => {
    const platformUri = `${PlatformURI}/workbench/sanity-ws`
    const randomSkill = faker.string.alpha(5)

    await talentPage.navigateToPage(platformUri)
    await talentPage.openRecruitApplication()
    await talentPage.selectTalentsSection(platformUri + '/recruit/talents')
    await talentPage.inputNewTallent('Petr', 'Dooliutl')
    await talentPage.addSkill(randomSkill)
    await talentPage.clickOpenOtherSkills()
    await talentPage.selectSkill(randomSkill)
    await talentPage.createCandidate()
  })

  test('create-tag-candidate', async ({ page }) => {
    const platformUri = `${PlatformURI}/workbench/sanity-ws`
    const randomSkill1 = faker.string.alpha(5)
    const randomSkill2 = faker.string.alpha(5)
    const randomSkill3 = faker.string.alpha(5)

    await talentPage.navigateToPage(platformUri)
    await talentPage.openRecruitApplication()
    await talentPage.clickSkillsLink()
    await talentPage.createSkill(platformUri + '/recruit/skills', randomSkill1)
    await talentPage.createSkill(platformUri + '/recruit/skills', randomSkill2)
    await talentPage.createSkill(platformUri + '/recruit/skills', randomSkill3)
    const firstName = 'first-' + generateId(4)
    const lastName = 'last-' + generateId(4)
    await talentPage.createCandidateWithSkills(firstName, lastName, [randomSkill1, randomSkill2, randomSkill3])
  })
})
