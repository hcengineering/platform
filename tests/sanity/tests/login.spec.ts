import { test, expect } from '@playwright/test'

test.describe('login test', () => {
  test('check login', async ({ page }) => {
    // Create user and workspace
    await page.goto('http://localhost:8083/login%3Acomponent%3ALoginApp/login')

    const emaillocator = page.locator('[name=email]')
    await emaillocator.click()
    await emaillocator.fill('user1')

    const password = page.locator('[name=current-password]')
    await password.click()
    await password.fill('1234')

    const button = page.locator('button:has-text("Login")')
    expect(await button.isEnabled()).toBe(true)

    await button.click()
    await page.waitForNavigation()

    await page.click('text=sanity-ws')
  })
})
