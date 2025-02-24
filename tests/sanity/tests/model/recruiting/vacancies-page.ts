import { expect, type Locator, type Page } from '@playwright/test'
import { NewVacancy } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class VacanciesPage extends CommonRecruitingPage {
  readonly page: Page

  constructor (page: Page) {
    super(page)
    this.page = page
  }

  readonly pageHeader = (): Locator => this.page.locator('span[class*="header"]', { hasText: 'Vacancies' })
  readonly buttonCreateNewVacancy = (): Locator => this.page.locator('button > span', { hasText: 'Vacancy' })
  readonly textTableFirstCell = (): Locator => this.page.locator('div[class$="firstCell"]')
  readonly inputCreateVacancyTitle = (): Locator =>
    this.page.locator('form[id="recruit:string:CreateVacancy"] input[type="text"]')

  readonly inputCreateVacancyDescription = (): Locator =>
    this.page.locator('form[id="recruit:string:CreateVacancy"] div.text-editor-view')

  readonly buttonCreateVacancyLocation = (): Locator =>
    this.page.locator('form[id="recruit:string:CreateVacancy"] button span', { hasText: 'Location' })

  readonly buttonCreateVacancy = (): Locator =>
    this.page.locator('form[id="recruit:string:CreateVacancy"] button[type="submit"]')

  readonly buttonExport = (): Locator => this.page.locator('button[type="button"] > span', { hasText: 'Export' })
  readonly buttonView = (): Locator =>
    this.page.locator('div.hulyHeader-container > .hulyHeader-buttonsGroup.before button[data-id="btn-viewOptions"]')

  readonly buttonHideArchivedVacancies = (): Locator => this.page.locator('div.popup span.toggle-switch')
  readonly popupArchivedVacancy = (): Locator => this.page.locator('div.antiPopup :text("Archive")')
  readonly popupOk = (): Locator => this.page.locator('div.msgbox-container :text("Ok")')
  readonly rows = (): Locator => this.page.locator('tr[class*="row"]')
  readonly firstCellInRow = (): Locator => this.page.locator('tr[class*="row"] td:first-child > div')
  readonly vacancyByName = (vacancyName: string): Locator =>
    this.page.locator('tr', { hasText: vacancyName }).locator('div[class$="firstCell"]')

  readonly vacancy = (): Locator => this.page.locator('has-text("Vacancy")')
  readonly vacancyButton = (): Locator => this.page.locator('button:has-text("Vacancy")')
  readonly softwareEngineerInput = (): Locator => this.page.locator('[placeholder="Software\\ Engineer"]')
  readonly vacanciesCreateButton = (): Locator => this.page.locator('button:has-text("Create")')
  readonly recruitApplicationButton = (): Locator =>
    this.page.locator('[id="app-recruit\\:string\\:RecruitApplication"]')

  readonly vacanciesMenuLink = (): Locator => this.page.locator('.antiPanel-navigator').locator('text=Vacancies')
  readonly createVacancyButton = (): Locator => this.page.locator('button:has-text("Vacancy")')
  readonly vacancyInputField = (): Locator => this.page.locator('form [placeholder="Software\\ Engineer"]')
  readonly createButton = (): Locator => this.page.locator('form button:has-text("Create")')
  readonly vacancyRow = (vacancyId: string): Locator =>
    this.page.locator(`tr:has-text("${vacancyId}") > td:nth-child(3) >> .sm-tool-icon`)

  readonly applicationButton = (): Locator => this.page.getByRole('button', { name: 'Application', exact: true })
  readonly talentSelector = (): Locator =>
    this.page.locator('form[id="recruit:string:CreateApplication"] [id="vacancy.talant.selector"]')

  readonly softwareEngineerLink = (): Locator => this.page.locator('text=Software Engineer')
  readonly applicationsTabHeader = (): Locator => this.page.locator('.antiSection-header >> text=Applications')
  readonly secondTab = (): Locator => this.page.getByText('Done states')
  readonly applicantMarina = (): Locator => this.page.locator('text=M. Marina').first()
  readonly applicantJohn = (): Locator => this.page.locator('text=Multiseed John').first()
  readonly applicantAlex = (): Locator => this.page.locator('text=P. Alex').first()

  async clickOnVacancy (): Promise<void> {
    await this.vacanciesMenuLink().click()
  }

  async clickOnVacancyButton (): Promise<void> {
    await this.vacancyButton().click()
  }

  async fillSoftwareEngineerInput (vacancyId: string): Promise<void> {
    await this.softwareEngineerInput().fill(vacancyId)
  }

  async clickOnVacanciesCreateButton (): Promise<void> {
    await this.vacanciesCreateButton().click()
  }

  async createVacancy (vacancyId: string, jump: boolean = false): Promise<void> {
    if (jump) await this.recruitApplicationButton().click()
    await this.vacanciesMenuLink().click()
    await this.createVacancyButton().click()
    await this.vacancyInputField().fill(vacancyId)
    await this.createButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
  }

  async modifyVacancy (vacancyId: string): Promise<void> {
    await this.vacancyRow(vacancyId).click()
  }

  async createApplicationVacencies (assigneeName: string): Promise<void> {
    await this.applicationButton().click()
    await this.talentSelector().click()
    await this.selectAssignee(this.page, assigneeName)
    await this.createButton().click()
    await this.page.waitForSelector('form.antiCard', { state: 'detached' })
    await expect(this.page.locator('text=APP-').first()).toBeVisible()
    await expect(this.page.locator(`text=P. ${assigneeName}`).first()).toBeVisible()
  }

  async navigateToSoftwareEngineerVacancies (): Promise<void> {
    await this.vacanciesMenuLink().click()
    await this.softwareEngineerLink().click()
  }

  async selectApplicationsTab (): Promise<void> {
    await this.applicationsTabHeader().click()
    await this.secondTab().click()
  }

  async verifyApplicantsVisibility (): Promise<void> {
    await expect(this.applicantMarina()).toBeVisible()
    await expect(this.applicantJohn()).toBeVisible()
    await expect(this.applicantAlex()).toBeVisible()
  }

  async createNewVacancy ({ title, description, location }: NewVacancy): Promise<void> {
    await this.buttonCreateNewVacancy().click()

    await this.inputCreateVacancyTitle().fill(title)
    await this.inputCreateVacancyDescription().fill(description)
    if (location != null) {
      await this.buttonCreateVacancyLocation().click()
      await this.fillToSelectPopup(this.page, location)
    }

    await this.buttonCreateVacancy().click()
  }

  async openVacancyByName (vacancyName: string): Promise<void> {
    await this.vacancyByName(vacancyName).click()
  }

  async clickOnHideArchivedVacancies (): Promise<void> {
    await this.buttonHideArchivedVacancies().click()
  }

  async rightClickVacancyByName (vacancyName: string): Promise<void> {
    await this.vacancyByName(vacancyName).click({ button: 'right' })
  }

  async archiveVacancyByName (vacancyName: string): Promise<void> {
    await this.rightClickVacancyByName(vacancyName)
    await expect(this.popupArchivedVacancy()).toBeVisible({ timeout: 15000 })
    await this.popupArchivedVacancy().click()
    await expect(this.popupOk()).toBeVisible({ timeout: 15000 })
    await this.popupOk().click()
  }

  async checkVacancyNotExist (vacancyName: string, message: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: vacancyName }), message).toHaveCount(0)
  }

  async checkVacancyExist (vacancyName: string, message: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: vacancyName }), message).toHaveCount(1)
  }

  async selectAll (): Promise<void> {
    const count = await this.rows().count()
    for (let i = 0; i < count; i++) {
      await this.rows().nth(i).hover()
      await this.firstCellInRow().nth(i).click()
    }
  }

  async exportVacanciesWithCheck (textToCheck: string, timeout: number): Promise<void> {
    let expired = 2
    while (true) {
      let shouldExit = false
      const downloadPromise = this.page.waitForEvent('download')
      await this.buttonExport().click()
      const download = await downloadPromise
      const readable = await download.createReadStream()
      await new Promise<void>((resolve) => {
        const chunks: string[] = []

        readable.on('readable', () => {
          let chunk
          while ((chunk = readable.read()) !== null) {
            chunks.push(chunk)
          }
        })

        readable.on('end', () => {
          const content = chunks.join('')
          if (content.includes(textToCheck)) {
            shouldExit = true
          } else {
            expired--
          }
          resolve()
        })
      })
      if (shouldExit) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, timeout / 2))
      if (expired === 0) {
        expect('').toContain(textToCheck)
      }
    }
  }

  async showArchivedVacancy (): Promise<void> {
    await this.buttonView().click()
    await this.buttonHideArchivedVacancies().click()
  }
}
