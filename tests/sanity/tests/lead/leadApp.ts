import { expect, type Locator, type Page } from '@playwright/test'
import { CustomerData } from './testData';

export class leadAppPage {
  readonly page: Page
  readonly leadAppIcon: Locator
  readonly newCustomer: Locator
  readonly firstName: Locator
  readonly lastName: Locator
  readonly location: Locator
  readonly description: Locator
  readonly createButton: Locator
  readonly customer: Locator
  readonly tableCustomerName: Locator
  readonly threeDotIcon: Locator
  readonly apboxList: Locator
  readonly yesButton: Locator

  constructor (page: Page) {
    this.page = page
    this.newCustomer = page.locator('text=New Customer')
    this.leadAppIcon = page.locator('[id="app-lead\\:string\\:LeadApplication"]')
    this.firstName = page.locator('input[placeholder="First name"]')
    this.lastName = page.locator('input[placeholder="Last name"]')
    this.location = page.locator('input[placeholder="Location"]')
    this.description = page.locator('input[placeholder="Add description..."]')
    this.createButton = page.locator('button[type="submit"] span', { hasText: 'Create' })
    this.customer = page.locator('span', { hasText: 'Customers' })
    this.tableCustomerName = page.locator('tbody tr td:nth-child(2) span:nth-child(2)')
    this.threeDotIcon = page.locator('div.popupPanel-title div.flex-row-center button.antiButton:nth-child(1)')
    this.apboxList = page.locator('div.ap-box button')
    this.yesButton = page.locator('div.buttons-group button.antiButton span', { hasText: 'Yes' })
  }

  async createCustomer (customer: CustomerData): Promise<void> {
    await this.firstName.fill(customer.firstName)
    await this.lastName.fill(customer.lastName)
    await this.location.fill(customer.location)
    await this.description.fill(customer.description)
  }

  async valiadateAddedCustomer (customer: CustomerData): Promise<void> {
    const fullName = `${customer.lastName} ${customer.firstName}`;
    const customerNameElement = await this.tableCustomerName.first();
    const actualFullName = await customerNameElement.innerText();

    expect(actualFullName).toContain(fullName);
  }

  async deleteCreatedCustomer(customer: CustomerData): Promise<void> {
    const fullName = `${customer.lastName} ${customer.firstName}`;

    const customerNameElements = await this.tableCustomerName.all();
    for (const element of customerNameElements) {
        const actualFullName = await element.innerText();
        if (actualFullName === fullName) {
          await element.click();
          break;
        }
    }

    await this.threeDotIcon.click()
    await this.apboxList.filter({ hasText: 'Delete' }).click();
    await this.yesButton.click();
}

}