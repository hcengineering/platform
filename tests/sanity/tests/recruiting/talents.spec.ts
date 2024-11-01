import { test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { TalentsPage } from '../model/recruiting/talents-page'
import { TalentDetailsPage } from '../model/recruiting/talent-details-page'
import { TalentName } from '../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('candidate/talents tests', () => {
  let talentsPage: TalentsPage
  let navigationMenuPage: NavigationMenuPage
  let talentDetailsPage: TalentDetailsPage

  test.beforeEach(async ({ page }) => {
    talentsPage = new TalentsPage(page)
    navigationMenuPage = new NavigationMenuPage(page)
    talentDetailsPage = new TalentDetailsPage(page)

    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  test('create-candidate', async () => {
    const first = 'Elton-' + generateId(4)
    const last = 'John-' + generateId(4)
    const loc = 'Cupertino'
    const email = `ej-${generateId(4)}@test.com`

    await talentsPage.clickRecruitApplication()
    await talentsPage.clickTalentsTab()
    await talentsPage.clickNewTalent()
    await talentsPage.enterFirstName(first)
    await talentsPage.enterLastName(last)
    await talentsPage.enterTitle()
    await talentsPage.enterLocation(loc)
    await talentsPage.addSocialLinks()
    await talentsPage.selectEmail()
    await talentsPage.enterEmail(email)
    await talentsPage.confirmEmail()
    await talentsPage.createTalent()
    await talentsPage.verifyTalentDetails(first, last, loc)
    await talentsPage.verifyEmailInPopup(email)
  })

  test('Edit the Talent', async () => {
    await navigationMenuPage.clickButtonTalents()
    const talentName = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.addComment('Test Talent Detail 123')
    await talentDetailsPage.checkCommentExist('Test Talent Detail 123')
    await talentDetailsPage.addAttachments('cat.jpeg')
    await talentDetailsPage.addFirstReview('First Talent Review', 'First Talent review description')
    const skillTag = `React-${generateId(4)}`
    await talentDetailsPage.addSkill(skillTag, 'Description Java from Talent Description page')
    await talentDetailsPage.checkSkill(skillTag)
    await talentDetailsPage.addSocialLinks('Phone', '123123213213')
    await talentDetailsPage.checkSocialLinks('Phone', '123123213213')
    await talentDetailsPage.inputLocation().fill('Awesome Location')
    const title = `Title-${generateId(4)}`
    await talentDetailsPage.addTitle(title)
    // ADD ASSERTION
  })

  test('Delete the Talent', async () => {
    await navigationMenuPage.clickButtonTalents()
    const talentName = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentName)
    await talentDetailsPage.inputLocation().fill('Awesome Location')
    await talentDetailsPage.deleteEntity()
    await navigationMenuPage.clickButtonTalents()
    await talentsPage.checkTalentNotExist(talentName)
  })

  test.skip('Merge contacts', async () => {
    const firstLocation = 'Location 1'
    const secondLocation = 'Location 2'

    await navigationMenuPage.clickButtonTalents()
    // talent1
    const talentNameFirst = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentNameFirst)

    await talentDetailsPage.enterLocation(firstLocation)
    const titleTalent1 = 'TitleMerge1'
    await talentDetailsPage.addTitle(titleTalent1)
    const sourceTalent1 = 'SourceTalent1'
    await talentDetailsPage.addSource(sourceTalent1)
    await talentDetailsPage.addSocialLinks('Phone', '123123213213')

    // talent 2
    await navigationMenuPage.clickButtonTalents()
    const talentNameSecond = await talentsPage.createNewTalent()
    await talentsPage.openTalentByTalentName(talentNameSecond)

    await talentDetailsPage.enterLocation(secondLocation)
    const titleTalent2 = 'TitleMerge2'
    await talentDetailsPage.addTitle(titleTalent2)
    const sourceTalent2 = 'SourceTalent2'
    await talentDetailsPage.addSource(sourceTalent2)
    await talentDetailsPage.addSocialLinks('Email', 'test-merge-2@gmail.com')

    // merge
    await navigationMenuPage.clickButtonTalents()
    await talentsPage.openTalentByTalentName(talentNameFirst)

    await talentDetailsPage.mergeContacts({
      finalContactName: talentNameSecond.lastName,
      name: `${talentNameFirst.lastName} ${talentNameFirst.firstName}`,
      mergeLocation: true,
      location: firstLocation,
      mergeTitle: true,
      title: titleTalent2,
      mergeSource: true,
      source: sourceTalent1
    })

    await navigationMenuPage.clickButtonTalents()
    await talentsPage.searchTalentByTalentName(talentNameFirst)
    await talentsPage.openTalentByTalentName(talentNameFirst)
    await talentDetailsPage.checkSocialLinks('Phone', '123123213213')
    await talentDetailsPage.checkSocialLinks('Email', 'test-merge-2@gmail.com')
    await talentDetailsPage.checkMergeContacts(firstLocation, titleTalent2, sourceTalent1)
  })

  test('Match to vacancy', async () => {
    const talentName: TalentName = {
      firstName: 'Software',
      lastName: `Engineer-${generateId(4)}`
    }
    await navigationMenuPage.clickButtonTalents()
    await talentsPage.createNewTalentWithName(talentName.firstName, talentName.lastName)
    await talentsPage.rightClickAction(talentName, 'Match to vacancy')
    await talentsPage.checkMatchVacancy(`${talentName.lastName} ${talentName.firstName}`, '0')
  })

  test('Filtering talents by skills', async ({ page }) => {
    const skillName = `Skill-${generateId(4)}`
    const talentName = 'P. Andrey'

    await navigationMenuPage.clickButtonTalents()
    await talentsPage.checkRowsInTableExist(talentName)
    const talentsCount = await talentsPage.linesFromTable().count()
    await talentsPage.openRowInTableByText(talentName)
    await talentDetailsPage.addSkill(skillName, 'Skill Description')
    await talentDetailsPage.buttonClosePanel().click()
    await talentsPage.selectFilter('Skills', skillName)
    await talentsPage.checkRowsInTableExist(talentName)
    await talentsPage.filterOppositeCondition('Skill', 'is', 'is not')
    await talentsPage.checkRowsInTableNotExist(talentName)
    await talentsPage.checkRowsInTableExist('', talentsCount - 1)
  })
})
