import { expect, type Locator, type Page } from '@playwright/test'

export enum DataType {
  URL,
  String,
  Boolean,
  Number,
  Date,
  Ref,
  Array,
  Enum
}

export class ClassProperties {
  readonly page: Page

  constructor (page: Page) {
    this.page = page
  }

  url = (): Locator => this.page.getByRole('button', { name: 'URL' })
  string = (): Locator => this.page.getByRole('button', { name: 'Text', exact: true })
  boolean = (): Locator => this.page.getByRole('button', { name: 'Checkbox' })
  number = (): Locator => this.page.getByRole('button', { name: 'Number' })
  date = (): Locator => this.page.getByRole('button', { name: 'Date' })
  ref = (): Locator => this.page.getByRole('button', { name: 'Reference' })
  array = (): Locator => this.page.getByRole('button', { name: 'Multi-Select' })
  enum = (): Locator => this.page.getByRole('button', { name: 'Select', exact: true })

  addedCustomAttribute = (attribute: string): Locator => this.page.getByRole('button', { name: attribute })
  inputName = (): Locator => this.page.getByPlaceholder('Name')
  createButton = (): Locator => this.page.getByRole('button', { name: 'Create' })
  enterTextString = (): Locator => this.page.getByPlaceholder('Type text...')
  confirmChange = (): Locator => this.page.locator('.selectPopup button')

  async selectDataType (dataType: DataType): Promise<void> {
    switch (dataType) {
      case DataType.URL:
        await this.url().click()
        break
      case DataType.String:
        await this.string().click()
        break
      case DataType.Boolean:
        await this.boolean().click()
        break
      case DataType.Number:
        await this.number().click()
        break
      case DataType.Date:
        await this.date().click()
        break
      case DataType.Ref:
        await this.ref().click()
        break
      case DataType.Array:
        await this.array().click()
        break
      case DataType.Enum:
        await this.enum().click()
        break
      default:
        throw new Error('Unknown data type')
    }
  }

  async clickCustomAttribute (attribute: string): Promise<void> {
    await this.addedCustomAttribute(attribute).click()
  }

  async fillName (name: string): Promise<void> {
    await this.inputName().fill(name)
  }

  async clickCreateButton (): Promise<void> {
    await this.createButton().click()
  }

  async fillEnterTextString (newString: string): Promise<void> {
    await this.enterTextString().fill(newString)
  }

  async clickConfirmChange (): Promise<void> {
    await this.confirmChange().click()
  }

  async checkIfStringIsUpdated (customAttribute: string): Promise<void> {
    await expect(this.addedCustomAttribute(customAttribute)).toBeVisible()
  }
}
