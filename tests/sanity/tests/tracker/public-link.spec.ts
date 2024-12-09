import { expect, test } from '@playwright/test'
import { generateId, PlatformSetting, PlatformURI, setTestOptions } from '../utils'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'
import { NewIssue } from '../model/tracker/types'
import { prepareNewIssueWithOpenStep } from './common-steps'
import { PublicLinkPopup } from '../model/tracker/public-link-popup'

test.describe('Tracker public link issues tests', () => {
  test('Public link generate', async ({ browser }) => {
    const publicLinkIssue: NewIssue = {
      title: `Public link generate issue-${generateId()}`,
      description: 'Public link generate issue'
    }

    let link: string
    await test.step('Get public link from popup', async () => {
      const newContext = await browser.newContext({ storageState: PlatformSetting })
      const page = await newContext.newPage()

      try {
        await page.goto(`${PlatformURI}/workbench/sanity-ws`)
        await setTestOptions(page)

        await prepareNewIssueWithOpenStep(page, publicLinkIssue)

        const issuesDetailsPage = new IssuesDetailsPage(page)
        await issuesDetailsPage.moreActionOnIssue('Public link')

        const publicLinkPopup = new PublicLinkPopup(page)
        link = await publicLinkPopup.getPublicLink()
      } finally {
        await page.close()
        await newContext.close()
      }
    })

    await test.step('Check guest access to the issue', async () => {
      const clearSession = await browser.newContext()
      await clearSession.clearCookies()
      await clearSession.clearPermissions()

      const clearPage = await clearSession.newPage()
      try {
        await clearPage.goto(link)

        const clearIssuesDetailsPage = new IssuesDetailsPage(clearPage)
        await clearIssuesDetailsPage.waitDetailsOpened(publicLinkIssue.title)
        await clearIssuesDetailsPage.checkIssue({
          ...publicLinkIssue,
          status: 'Backlog'
        })
        expect(clearPage.url()).toContain('guest')
      } finally {
        await clearPage.close()
        await clearSession.close()
      }
    })
  })

  test('Public link Revoke', async ({ browser }) => {
    const publicLinkIssue: NewIssue = {
      title: `Public link Revoke issue-${generateId()}`,
      description: 'Public link Revoke issue'
    }

    const newContext = await browser.newContext({ storageState: PlatformSetting })
    const page = await newContext.newPage()

    const clearSession = await browser.newContext()
    const clearPage = await clearSession.newPage()
    try {
      let link: string

      await test.step('Get public link from popup', async () => {
        await page.goto(`${PlatformURI}/workbench/sanity-ws`)
        await setTestOptions(page)

        await prepareNewIssueWithOpenStep(page, publicLinkIssue)

        const issuesDetailsPage = new IssuesDetailsPage(page)
        await issuesDetailsPage.moreActionOnIssue('Public link')

        const publicLinkPopup = new PublicLinkPopup(page)
        link = await publicLinkPopup.getPublicLink()
      })

      await test.step('Check guest access to the issue', async () => {
        await clearPage.goto(link)
        await setTestOptions(clearPage)

        const clearIssuesDetailsPage = new IssuesDetailsPage(clearPage)
        await clearIssuesDetailsPage.waitDetailsOpened(publicLinkIssue.title)
        await clearIssuesDetailsPage.checkIssue({
          ...publicLinkIssue,
          status: 'Backlog'
        })
        expect(clearPage.url()).toContain('guest')
      })

      await test.step('Revoke guest access to the issue', async () => {
        const publicLinkPopup = new PublicLinkPopup(page)
        await publicLinkPopup.revokePublicLink()
      })

      await test.step('Check guest access to the issue after the revoke', async () => {
        await clearPage.goto(link)
        await setTestOptions(clearPage)
        await expect(clearPage.locator('div.antiPopup > h1')).toHaveText('Public link was revoked')
      })
    } finally {
      await clearPage.close()
      await clearSession.close()
      await page.close()
      await newContext.close()
    }
  })
})
