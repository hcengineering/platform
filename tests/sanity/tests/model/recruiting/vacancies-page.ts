import { expect, type Locator, type Page } from '@playwright/test'
import { NewVacancy } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class VacanciesPage extends CommonRecruitingPage {
  readonly page: Page

  constructor(page: Page) {
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
    this.page.locator('div.search-start button[type="button"] > span', { hasText: 'View' })

  readonly buttonHideArchivedVacancies = (): Locator => this.page.locator('div.popup span.toggle-switch')
  readonly popupArchivedVacancy = (): Locator => this.page.locator('div.antiPopup :text("Archive")')
  readonly popupOk = (): Locator => this.page.locator('div.msgbox-container :text("Ok")')
  readonly rows = (): Locator => this.page.locator('tr[class*="row"]')
  readonly firstCellInRow = (): Locator => this.page.locator('tr[class*="row"] td:first-child > div')
  readonly vacancyByName = (vacancyName: string): Locator =>
    this.page.locator('tr', { hasText: vacancyName }).locator('div[class$="firstCell"]')

  async createNewVacancy({ title, description, location }: NewVacancy): Promise<void> {
    await this.buttonCreateNewVacancy().click()

    await this.inputCreateVacancyTitle().fill(title)
    await this.inputCreateVacancyDescription().fill(description)
    if (location != null) {
      await this.buttonCreateVacancyLocation().click()
      await this.fillToSelectPopup(this.page, location)
    }

    await this.buttonCreateVacancy().click()
  }

  async openVacancyByName(vacancyName: string): Promise<void> {
    await this.vacancyByName(vacancyName).click()
  }

  async clickOnHideArchivedVacancies(): Promise<void> {
    await this.buttonHideArchivedVacancies().click()
  }

  async rightClickVacancyByName(vacancyName: string): Promise<void> {
    await this.vacancyByName(vacancyName).click({ button: 'right' })
  }

  async archiveVacancyByName(vacancyName: string): Promise<void> {
    await this.rightClickVacancyByName(vacancyName)
    await expect(this.popupArchivedVacancy()).toBeVisible({ timeout: 15000 })
    await this.popupArchivedVacancy().click()
    await expect(this.popupOk()).toBeVisible({ timeout: 15000 })
    await this.popupOk().click()
  }

  async checkVacancyNotExist(vacancyName: string, message: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: vacancyName }), message).toHaveCount(0)
  }

  async checkVacancyExist(vacancyName: string, message: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: vacancyName }), message).toHaveCount(1)
  }

  async selectAll(): Promise<void> {
    const count = await this.rows().count()
    for (let i = 0; i < count; i++) {
      await this.rows().nth(i).hover()
      await this.firstCellInRow().nth(i).click()
    }
  }

  async exportVacanciesWithCheck(textToCheck: string, timeout: number): Promise<void> {
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

  async showArchivedVacancy(): Promise<void> {
    await this.buttonView().click()
    await this.buttonHideArchivedVacancies().click()
  }
}
