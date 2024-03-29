import { test, expect } from '@playwright/test';
import { PlatformSetting } from './utils';


test.use({
    storageState: PlatformSetting
});

test('Create a new category and add new product to that category', async ({ page }) => {
  await page.goto('http://localhost:8083/workbench/sanity-ws/');
  await page.locator('[id="app-inventory\\:string\\:Inventory"]').click();
  await page.getByRole('link', { name: 'Categories' }).click();
  await page.getByRole('button', { name: 'Category' }).click();
  await page.getByPlaceholder('Category').click();
  await page.getByPlaceholder('Category').fill('new-test-category');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('button', { name: 'Product' }).click();
  await page.getByPlaceholder('Product').fill('new-test-product');
  await page.getByRole('button', { name: 'Category' }).click();
  await page.getByRole('button', { name: 'new-test-category' }).first().click();
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: 'Categories' }).click();
});