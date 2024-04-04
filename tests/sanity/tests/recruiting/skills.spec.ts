import { test } from '@playwright/test'
import { NavigationMenuPage } from '../model/recruiting/navigation-menu-page'
import { SkillsPage } from '../model/recruiting/skill-page'
import { generateId, PlatformSetting, PlatformURI } from '../utils'
import { NewSkill } from '../model/recruiting/types'

test.use({
  storageState: PlatformSetting
})

test.describe('skill tests', () => {
  test.beforeEach(async ({ page }) => {
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/recruit`))?.finished()
  })

  // test.skip('create skill', async ({ page }) => {
  //   await page.click('[id="app-recruit\\:string\\:RecruitApplication"]')
  //   await page.click('text=Skills')
  //   await page.click('button:has-text("Skill")')
  //   await page.click('[placeholder="Please\\ type\\ skill\\ title"]')
  //   const skillId = 'custom-skill-' + generateId()
  //   await page.fill('[placeholder="Please\\ type\\ skill\\ title"]', skillId)
  //   await page.click('button:has-text("Other")')
  //   await page.click('button:has-text("Design")')
  //   await page.click('button:has-text("Create")')
  //   await page.click(`text=${skillId}`)
  //   await page.click('[placeholder="Please\\ type\\ description\\ here"]')
  //   await page.fill('[placeholder="Please\\ type\\ description\\ here"]', 'description-' + skillId)
  //   await page.click('button:has-text("Save")')
  //   await page.click(`span:has-text("description-${skillId}")`)
  // })

  test('createSkill', async ({page}) =>{
    const skillName = 'Skill Set Name ' + generateId(4)

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonSkills.click()
    
    const skillsPage = new SkillsPage(page)

    const newSkill: NewSkill = {
      title: skillName,
      description: skillName + ' Description',
      category: 'Backend development'
    };
    await skillsPage.createNewSkill(newSkill)
    await skillsPage.checkSkillHasBeenAdded(newSkill)
  })

  test('deleteSkill',async ({page}) => {
    const skillName = 'Skill Set Name ' + generateId(4)

    const navigationMenuPage = new NavigationMenuPage(page)
    await navigationMenuPage.buttonSkills.click()
    
    const skillsPage = new SkillsPage(page)

    const newSkill: NewSkill = {
      title: skillName,
      description: skillName + ' Description',
      category: 'Backend development'
    };

    await skillsPage.createNewSkill(newSkill)
    await skillsPage.checkSkillHasBeenAdded(newSkill)

    await skillsPage.rightClickOnSkillTitle(newSkill)
    await skillsPage.clickOnDeleteAndConfirmIt()

    await page.waitForTimeout(2000);
    await skillsPage.checkSkillIsDeleted(newSkill)
  })
})
