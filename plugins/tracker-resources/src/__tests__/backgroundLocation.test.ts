//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import * as Platform from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { type Issue } from '@hcengineering/tracker'
import { type Location } from '@hcengineering/ui'
import { accessDeniedStore } from '@hcengineering/view-resources'
import { resolveTabLocation } from '@hcengineering/workbench-resources/src/tabLocation'
import { type Application } from '@hcengineering/workbench'
import { resolveLocation } from '../issues'

const { getResource } = Platform

jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual<typeof Platform>('@hcengineering/platform'),
  getResource: jest.fn()
}))
jest.mock('@hcengineering/presentation', () => ({ getClient: jest.fn() }))
jest.mock('@hcengineering/ui', () => ({ getPanelURI: jest.fn() }))
jest.mock('@hcengineering/view-resources', () => ({ accessDeniedStore: { set: jest.fn() } }))
jest.mock('svelte/store', () => ({ writable: jest.fn() }))
jest.mock('../plugin', () => ({
  __esModule: true,
  default: { class: { Issue: 'tracker:class:Issue' }, component: { EditIssue: 'tracker:component:EditIssue' } }
}))

// Real issue short-link shape and production tab -> tracker resolver chain, with
// synthetic client/resource fixtures. This does not mount Workbench, persist tabs,
// perform server authorization or exercise DOM/browser navigation.
describe('background issue location resolution', () => {
  const loc: Location = { path: ['workbench', 'workspace', 'tracker', 'PROJ-123'] }
  const app: Pick<Application, 'locationResolver'> = {
    locationResolver: 'tracker:resolver:Location' as NonNullable<Application['locationResolver']>
  }
  const findOne = jest.fn<Promise<Issue | undefined>, [unknown, unknown, unknown]>()
  const setAccessDenied = jest.spyOn(accessDeniedStore, 'set')
  const logError = jest.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    jest.clearAllMocks()
    const client = { findOne }
    jest.mocked(getClient).mockReturnValue(client as unknown as ReturnType<typeof getClient>)
    jest.mocked(getResource).mockResolvedValue(resolveLocation)
  })

  afterAll(() => {
    logError.mockRestore()
    setAccessDenied.mockRestore()
  })

  it.each([false, true])(
    'a deferred missing target preserves a newer navigation access-denied state (%s)',
    async (denied) => {
      let completeLookup: (issue: Issue | undefined) => void = () => {
        throw new Error('Lookup not started')
      }
      const lookup = new Promise<Issue | undefined>((resolve) => {
        completeLookup = resolve
      })
      let lookupStarted: () => void = () => {
        throw new Error('Lookup not initialized')
      }
      const started = new Promise<void>((resolve) => {
        lookupStarted = resolve
      })
      findOne.mockImplementationOnce(async () => {
        lookupStarted()
        return await lookup
      })

      const pending = resolveTabLocation(loc, app)
      await started
      expect(findOne).toHaveBeenCalledWith('tracker:class:Issue', { identifier: 'PROJ-123' }, { showArchived: true })
      // Model an intervening navigation while the background lookup is pending.
      // Both a successful view and a denied view must retain their own state.
      accessDeniedStore.set(denied)
      setAccessDenied.mockClear()
      completeLookup(undefined)

      await expect(pending).resolves.toBe(loc)
      expect(setAccessDenied).not.toHaveBeenCalled()
      expect(getResource).toHaveBeenCalledWith(app.locationResolver)
    }
  )

  it('retains access-denied reporting for foreground navigation to a missing issue', async () => {
    findOne.mockResolvedValueOnce(undefined)

    await expect(resolveLocation(loc)).resolves.toBeUndefined()

    expect(setAccessDenied).toHaveBeenCalledTimes(1)
    expect(setAccessDenied).toHaveBeenCalledWith(true)
  })

  it('returns the original location when no resolver is configured', async () => {
    await expect(resolveTabLocation(loc)).resolves.toBe(loc)
    expect(getResource).not.toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalled()
    expect(setAccessDenied).not.toHaveBeenCalled()
  })
})
