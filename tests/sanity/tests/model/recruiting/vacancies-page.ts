import { expect, type Locator, type Page } from '@playwright/test'
import { NewVacancy } from './types'
import { CommonRecruitingPage } from './common-recruiting-page'

export class VacanciesPage extends CommonRecruitingPage {
  readonly page: Page
  readonly pageHeader: Locator
  readonly buttonCreateNewVacancy: Locator
  readonly textTableFirstCell: Locator
  readonly inputCreateVacancyTitle: Locator
  readonly inputCreateVacancyDescription: Locator
  readonly buttonCreateVacancyLocation: Locator
  readonly buttonCreateVacancy: Locator
  readonly buttonExport: Locator
  readonly buttonView: Locator
  readonly buttonHideArchivedVacancies: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.pageHeader = page.locator('span[class*="header"]', { hasText: 'Vacancies' })
    this.buttonCreateNewVacancy = page.locator('button > span', { hasText: 'Vacancy' })
    this.textTableFirstCell = page.locator('div[class$="firstCell"]')
    this.inputCreateVacancyTitle = page.locator('form[id="recruit:string:CreateVacancy"] input[type="text"]')
    this.inputCreateVacancyDescription = page.locator('form[id="recruit:string:CreateVacancy"] div.text-editor-view')
    this.buttonCreateVacancyLocation = page.locator('form[id="recruit:string:CreateVacancy"] button span', {
      hasText: 'Location'
    })
    this.buttonCreateVacancy = page.locator('form[id="recruit:string:CreateVacancy"] button[type="submit"]')
    this.buttonExport = page.locator('button[type="button"] > span', { hasText: 'Export' })
    this.buttonView = page.locator('div.search-start button[type="button"] > span', { hasText: 'View' })
    this.buttonHideArchivedVacancies = page.locator('div.popup span.toggle-switch')
  }

  async createNewVacancy ({ title, description, location }: NewVacancy): Promise<void> {
    await this.buttonCreateNewVacancy.click()

    await this.inputCreateVacancyTitle.fill(title)
    await this.inputCreateVacancyDescription.fill(description)
    if (location != null) {
      await this.buttonCreateVacancyLocation.click()
      await this.fillToSelectPopup(this.page, location)
    }

    await this.buttonCreateVacancy.click()
  }

  async openVacancyByName (vacancyName: string): Promise<void> {
    await this.page.locator('tr', { hasText: vacancyName }).locator('div[class$="firstCell"]').click()
  }

  async rightClickVacancyByName (vacancyName: string): Promise<void> {
    await this.page
      .locator('tr', { hasText: vacancyName })
      .locator('div[class$="firstCell"]')
      .click({ button: 'right' })
  }

  async archiveVacancyByName (vacancyName: string): Promise<void> {
    await this.rightClickVacancyByName(vacancyName)
    await this.page.waitForSelector('div.antiPopup :text("Archive")')
    await this.page.locator('div.antiPopup :text("Archive")').click()
    await this.page.waitForSelector('div.msgbox-container :text("Ok")')
    await this.page.locator('div.msgbox-container :text("Ok")').click()
  }

  async checkVacancyNotExist (vacancyName: string, message: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: vacancyName }), message).toHaveCount(0)
  }

  async checkVacancyExist (vacancyName: string, message: string): Promise<void> {
    await expect(this.page.locator('tr', { hasText: vacancyName }), message).toHaveCount(1)
  }

  async selectAll (): Promise<void> {
    const count = await this.page.locator('tr[class*="row"]').count()
    for (let i = 0; i < count; i++) {
      await this.page.locator('tr[class*="row"]').nth(i).hover()
      await this.page.locator('tr[class*="row"] td:first-child > div').nth(i).click()
    }
  }

  async exportVacanciesWithCheck (textToCheck: string, timeout: number): Promise<void> {
    let expired = 2
    while (true) {
      let shouldExit = false
      const downloadPromise = this.page.waitForEvent('download')
      await this.buttonExport.click()
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
    await this.buttonView.click()
    await this.buttonHideArchivedVacancies.click()
  }
}
