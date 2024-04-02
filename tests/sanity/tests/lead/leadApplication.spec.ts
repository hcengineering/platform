import { test, expect } from '@playwright/test';
import { PlatformURI, PlatformSetting } from '../utils';
import { leadAppPage } from './leadApp';
import {customerData } from './testData';

test.use({
    storageState: PlatformSetting
})

test.describe('Lead Application folder', () => {
    test.beforeEach(async ({ page }) => {
        await (await page.goto(`${PlatformURI}/workbench/sanity-ws/sanity-ws`))
        console.log(`Navigating to ${PlatformURI}/workbench/sanity-ws/sanity-ws`)
      })

    test('Create New Customer', async ({ page }) => {
        const LeadAppPage = new leadAppPage(page)
        await LeadAppPage.leadAppIcon.click()
        await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/lead`)

        await LeadAppPage.newCustomer.click()
        await LeadAppPage.createCustomer(customerData)
        await LeadAppPage.createButton.click()

        // Validad customer is added successfully
        await LeadAppPage.customer.click()
        await LeadAppPage.valiadateAddedCustomer(customerData)
    })

    test('Delete newly Created Customer', async ({ page }) => {
        const LeadAppPage = new leadAppPage(page)
        await LeadAppPage.leadAppIcon.click()
        await expect(page).toHaveURL(`${PlatformURI}/workbench/sanity-ws/lead`)
        await LeadAppPage.customer.click()
        await LeadAppPage.deleteCreatedCustomer(customerData)
    })             
})