import { expect, type Locator, type Page } from '@playwright/test'

export class ClassesPage {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  member = (): Locator => this.page.getByRole('button', { name: 'Member' })
  contact = (): Locator => this.page.getByRole('button', { name: 'Contact' })
  person = (): Locator => this.page.getByRole('button', { name: 'Person' })
  employee = (): Locator => this.page.getByRole('button', { name: 'Employee' })
  worker = (): Locator => this.page.getByRole('button', { name: 'Worker' })
  talent = (): Locator => this.page.getByRole('button', { name: 'Talent' })
  company = (): Locator => this.page.getByRole('button', { name: 'Company' })
  customer = (): Locator => this.page.getByRole('button', { name: 'Customer' })
  vacancy = (): Locator => this.page.getByRole('button', { name: 'Vacancy', exact: true })
  defaultVacancy = (): Locator => this.page.getByRole('button', { name: 'Default vacancy', exact: true })
  funnel = (): Locator => this.page.getByRole('button', { name: 'Funnel', exact: true })
  defaultFunnel = (): Locator => this.page.getByRole('button', { name: 'Default funnel' })
  project = (): Locator => this.page.getByRole('button', { name: 'Project', exact: true })
  classicProject = (): Locator => this.page.getByRole('button', { name: 'Classic project', exact: true })
  board = (): Locator => this.page.getByRole('button', { name: 'Board' })
  task = (): Locator => this.page.getByRole('button', { name: 'Task' })
  application = (): Locator => this.page.getByRole('button', { name: 'Application' })
  applicant = (): Locator => this.page.getByRole('button', { name: 'Applicant' })
  lead = (): Locator => this.page.getByRole('button', { name: 'Lead' })
  issue = (): Locator => this.page.getByRole('button', { name: 'Issue' })
  card = (): Locator => this.page.getByRole('button', { name: 'Card' })
  product = (): Locator => this.page.getByRole('button', { name: 'Product' })

  async checkIfClassesExists (): Promise<void> {
    await expect(this.member()).toBeVisible()
    await expect(this.contact()).toBeVisible()
    await expect(this.person()).toBeVisible()
    await expect(this.employee()).toBeVisible()
    await expect(this.worker()).toBeVisible()
    await expect(this.talent()).toBeVisible()
    await expect(this.company()).toBeVisible()
    await expect(this.customer()).toBeVisible()
    await expect(this.vacancy()).toBeVisible()
    await expect(this.defaultVacancy()).toBeVisible()
    await expect(this.funnel()).toBeVisible()
    await expect(this.defaultFunnel()).toBeVisible()
    await expect(this.project()).toBeVisible()
    await expect(this.classicProject()).toBeVisible()
    await expect(this.board()).toBeVisible()
    await expect(this.task()).toBeVisible()
    await expect(this.application()).toBeVisible()
    await expect(this.applicant()).toBeVisible()
    await expect(this.lead().nth(0)).toBeVisible()
    await expect(this.lead().nth(1)).toBeVisible()
    await expect(this.issue().nth(0)).toBeVisible()
    await expect(this.issue().nth(1)).toBeVisible()
    await expect(this.card()).toBeVisible()
    await expect(this.product()).toBeVisible()
  }
}
