import { test, expect } from '@playwright/test'

// E2E coverage for the admin user management feature (PR-B).
// Full implementation comes online once the dk3 staging deploy is wired —
// see plan §11.4 in /opt/infrastructure/docs/superpowers/plans/2026-05-23-huly-admin-user-management.md.
// Each .skip below documents a planned scenario.

test.describe.skip('admin users management', () => {
  test('admin can navigate to /login/admin/users', async ({ page }) => {
    await page.goto('/login/admin/users')
    await expect(page.locator('h1')).toContainText('Users')
  })

  test('non-admin is redirected to /login', async () => {
    // ...
  })

  test('admin can change role of non-self user in a workspace', async () => {
    // ...
  })

  test('admin sees last-Owner toast when demoting the only Owner', async () => {
    // ...
  })

  test('disable triggers force-logout modal in a second-tab session', async () => {
    // ...
  })
})
