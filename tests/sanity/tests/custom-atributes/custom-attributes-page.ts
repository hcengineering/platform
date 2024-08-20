import { expect, type Locator, type Page } from '@playwright/test'

export enum CustomAttributesButtons {
  Member,
  Contact,
  Person,
  Employee,
  Worker,
  Talent,
  Company,
  Customer,
  Vacancy,
  DefaultVacancy,
  Funnel,
  DefaultFunnel,
  Project,
  ClassicProject,
  Board,
  Task,
  Application,
  Applicant,
  Lead,
  Issue,
  Card,
  Product
}

export class CustomAttributesPage {
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

  addAttribute = (): Locator => this.page.locator('.hulyTableAttr-header > .font-medium-14')

  async clickAddAttribute (): Promise<void> {
    await this.addAttribute().click()
  }

  async selectEntityTab (button: CustomAttributesButtons): Promise<void> {
    switch (button) {
      case CustomAttributesButtons.Member:
        await this.member().click()
        break
      case CustomAttributesButtons.Contact:
        await this.contact().click()
        break
      case CustomAttributesButtons.Person:
        await this.person().click()
        break
      case CustomAttributesButtons.Employee:
        await this.employee().click()
        break
      case CustomAttributesButtons.Worker:
        await this.worker().click()
        break
      case CustomAttributesButtons.Talent:
        await this.talent().click()
        break
      case CustomAttributesButtons.Company:
        await this.company().click()
        break
      case CustomAttributesButtons.Customer:
        await this.customer().click()
        break
      case CustomAttributesButtons.Vacancy:
        await this.vacancy().click()
        break
      case CustomAttributesButtons.DefaultVacancy:
        await this.defaultVacancy().click()
        break
      case CustomAttributesButtons.Funnel:
        await this.funnel().click()
        break
      case CustomAttributesButtons.DefaultFunnel:
        await this.defaultFunnel().click()
        break
      case CustomAttributesButtons.Project:
        await this.project().click()
        break
      case CustomAttributesButtons.ClassicProject:
        await this.classicProject().click()
        break
      case CustomAttributesButtons.Board:
        await this.board().click()
        break
      case CustomAttributesButtons.Task:
        await this.task().click()
        break
      case CustomAttributesButtons.Application:
        await this.application().click()
        break
      case CustomAttributesButtons.Applicant:
        await this.applicant().click()
        break
      case CustomAttributesButtons.Lead:
        await this.lead().click()
        break
      case CustomAttributesButtons.Issue:
        await this.issue().click()
        break
      case CustomAttributesButtons.Card:
        await this.card().click()
        break
      case CustomAttributesButtons.Product:
        await this.product().click()
        break
      default:
        throw new Error('Unknown button type')
    }
  }

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
