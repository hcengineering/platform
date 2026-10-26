//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import * as Core from '@hcengineering/core'
import * as Platform from '@hcengineering/platform'
import presentation, { getClient } from '@hcengineering/presentation'
import { hasResource } from '@hcengineering/presentation/src/configuration'
import { handleNewTabClick } from '@hcengineering/presentation/src/navLink'
import uiPlugin, {
  type AnyComponent,
  getCurrentLocation,
  type Location,
  locationToUrl,
  parseLocation
} from '@hcengineering/ui'
import { type Application } from '@hcengineering/workbench'
import { withWorkbenchSession } from '../session'
import { openWorkbenchTab, registerWorkbenchTabNavigation } from '../tabNavigation'
import { OpenInNewTab } from '../workbench'

const { AccountRole, getCurrentAccount } = Core
const { getMetadata, getResource, setMetadata, translate } = Platform

jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual<typeof Platform>('@hcengineering/platform'),
  getResource: jest.fn(),
  translate: jest.fn()
}))

jest.mock('@hcengineering/core', () => ({
  ...jest.requireActual<typeof Core>('@hcengineering/core'),
  getCurrentAccount: jest.fn()
}))

jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: {
    metadata: {
      OpenInNewTab: 'presentation:metadata:OpenInNewTab',
      CanOpenInNewTab: 'presentation:metadata:CanOpenInNewTab',
      FrontUrl: 'presentation:metadata:FrontUrl',
      SessionId: 'presentation:metadata:SessionId',
      Token: 'presentation:metadata:Token',
      WorkspaceUuid: 'presentation:metadata:WorkspaceUuid'
    }
  },
  getClient: jest.fn(),
  configurationStore: { subscribe: () => () => {} }
}))

jest.mock('@hcengineering/ui', () => ({
  __esModule: true,
  default: { metadata: { Routes: 'ui:metadata:Routes' } },
  getCurrentLocation: jest.fn(),
  locationToUrl: jest.fn(),
  parseLocation: jest.fn(),
  location: { subscribe: () => () => {} },
  languageStore: {
    subscribe: (run: (value: string) => void) => {
      run('en')
      return () => {}
    }
  }
}))

jest.mock('@hcengineering/presentation/src/configuration', () => ({ hasResource: jest.fn() }))

// This suite exercises orchestration in CommonJS Jest, not the Svelte ESM runtime.
// Keep the real provider policy/opener. Store subscriptions unrelated to opening
// are inert so importing the existing resource does not run tab sync/localStorage.
jest.mock('svelte/store', () => ({
  get: () => 'en',
  writable: () => ({ subscribe: () => () => {} }),
  derived: () => ({ subscribe: () => () => {} })
}))
jest.mock('../utils', () => ({ locationWorkspaceStore: { subscribe: () => () => {} } }))
jest.mock('@hcengineering/view-resources', () => ({ parseLinkId: jest.fn() }))

function deferred<T> (): { promise: Promise<T>, resolve: (value: T) => void } {
  let complete: (value: T) => void = () => {
    throw new Error('Deferred not initialized')
  }
  const promise = new Promise<T>((resolve) => {
    complete = resolve
  })
  return { promise, resolve: complete }
}

// Synthetic account/model/session fixtures. The real provider policy and metadata
// lifecycle, connection-session producer, gesture helper and tab-write orchestration
// run here, including the existing OpenInNewTab resource used by the menu action.
// Route parsing/resources, store subscriptions/reads, translation, persistence and
// (except in that resource case) metadata/title loading are mocked. No mounted
// shell, context-menu UI, server or browser runs.
describe('workbench tab capability', () => {
  const loc: Location = { path: ['workbench', 'workspace', 'tracker', 'PROJ-123'] }
  const findAllSync = jest.fn<Application[], [unknown, unknown]>()
  const createDoc = jest.fn<Promise<Core.Ref<Core.Doc>>, [unknown, unknown, unknown]>()
  const loadData = jest.fn<
  Promise<{ name?: string, label: Platform.IntlString }>,
  [Location, ReturnType<typeof getClient>]
  >()
  const label = 'workbench:string:Tab' as Platform.IntlString
  const onConnect = withWorkbenchSession(async () => {})
  let unregister: () => void
  let account: Core.Account

  function canOpen (target: Location = loc): boolean | undefined {
    return getMetadata(presentation.metadata.CanOpenInNewTab)?.(target)
  }

  beforeEach(async () => {
    jest.resetAllMocks()
    // Only identity and role are used by the production policy.
    account = { uuid: 'account', role: Core.AccountRole.User } as unknown as Core.Account
    const model = { findAllSync }
    const client = { getModel: () => model, createDoc }
    jest.mocked(getClient).mockReturnValue(client as unknown as ReturnType<typeof getClient>)
    jest.mocked(getCurrentAccount).mockReturnValue(account)
    jest.mocked(getCurrentLocation).mockReturnValue(loc)
    const app = { alias: 'tracker' } as unknown as Application
    findAllSync.mockReturnValue([app])
    jest.mocked(locationToUrl).mockReturnValue('workbench/workspace/tracker/PROJ-123')
    jest.mocked(translate).mockResolvedValue('Translated tab')
    loadData.mockResolvedValue({ name: 'PROJ-123', label })
    // Use the production callback's actual (event, lastTx, sessionId) contract.
    await onConnect(Core.ClientConnectEvent.Connected, 'initial-tx', 'session')
    setMetadata(presentation.metadata.Token, 'token')
    setMetadata(presentation.metadata.WorkspaceUuid, undefined)
    setMetadata(presentation.metadata.CanOpenInNewTab, undefined)
    unregister = registerWorkbenchTabNavigation()
  })

  afterEach(() => {
    unregister()
  })

  it.each([AccountRole.Guest, AccountRole.User, AccountRole.Owner])('allows writable role %s', (role) => {
    account.role = role
    expect(canOpen()).toBe(true)
    expect(findAllSync).toHaveBeenCalledWith('workbench:class:Application', { alias: 'tracker' })
  })

  it.each([AccountRole.ReadOnlyGuest, AccountRole.DocGuest])('rejects restricted role %s', (role) => {
    account.role = role
    expect(canOpen()).toBe(false)
  })

  it.each<{ path: string[] }>([
    { path: ['login'] },
    { path: ['guest', 'workspace', 'tracker'] },
    { path: ['onboard', 'workspace'] },
    { path: ['workbench', 'other-workspace', 'tracker'] },
    { path: ['workbench', 'workspace'] }
  ])('rejects target path $path', ({ path }) => {
    expect(canOpen({ path })).toBe(false)
  })

  it.each(['guest', 'login', 'onboard'])('rejects the current %s shell', (shell) => {
    jest.mocked(getCurrentLocation).mockReturnValue({ path: [shell, 'workspace', 'tracker'] })
    expect(canOpen()).toBe(false)
  })

  it('rejects a workspace switch even when the target belongs to the old workspace', () => {
    jest.mocked(getCurrentLocation).mockReturnValue({ path: ['workbench', 'new-workspace', 'tracker'] })
    expect(canOpen()).toBe(false)
  })

  it('rejects unknown applications and applications above the current role', () => {
    findAllSync.mockReturnValue([])
    expect(canOpen()).toBe(false)
    const app = { alias: 'tracker', accessLevel: Core.AccountRole.Owner } as unknown as Application
    findAllSync.mockReturnValue([app])
    expect(canOpen()).toBe(false)
  })

  it('invalidates the capability when the session changes', () => {
    setMetadata(presentation.metadata.SessionId, 'next-session')
    expect(canOpen()).toBe(false)
  })

  it.each([Core.ClientConnectEvent.Reconnected, Core.ClientConnectEvent.Refresh])(
    'allows a fresh open after a same-session reconnect with a newer lastTx (event %s)',
    async (event) => {
      // Transactions received while connected advance core's lastTx. Catching up
      // on reconnect changes the second argument, while the third stays stable.
      await onConnect(event, 'tx-received-while-connected', 'session')

      expect(getMetadata(presentation.metadata.SessionId)).toBe('session')
      expect(canOpen()).toBe(true)
      await openWorkbenchTab(loc, loadData)
      expect(createDoc).toHaveBeenCalledTimes(1)
    }
  )

  it.each([Core.ClientConnectEvent.Reconnected, Core.ClientConnectEvent.Refresh, Core.ClientConnectEvent.Upgraded])(
    'rejects an actual session replacement from connection event %s',
    async (event) => {
      await onConnect(event, 'initial-tx', 'replacement-session')

      expect(getMetadata(presentation.metadata.SessionId)).toBe('replacement-session')
      expect(canOpen()).toBe(false)
      await openWorkbenchTab(loc, loadData)
      expect(loadData).not.toHaveBeenCalled()
      expect(createDoc).not.toHaveBeenCalled()
    }
  )

  it('preserves session identity during maintenance and forwards all callback arguments', async () => {
    const handler = jest.fn<Promise<void>, Parameters<typeof onConnect>>().mockResolvedValue(undefined)
    const callback = withWorkbenchSession(handler)
    const statistics = { total: 10, toProcess: 3 }

    await callback(Core.ClientConnectEvent.Maintenance, undefined, statistics)

    expect(handler).toHaveBeenCalledWith(Core.ClientConnectEvent.Maintenance, undefined, statistics)
    expect(getMetadata(presentation.metadata.SessionId)).toBe('session')
    expect(canOpen()).toBe(true)
  })

  it('invalidates the capability when the token changes', () => {
    setMetadata(presentation.metadata.Token, 'next-token')
    expect(canOpen()).toBe(false)
  })

  it('invalidates the capability when the workspace identity changes', () => {
    setMetadata(presentation.metadata.WorkspaceUuid, 'next-workspace' as Core.WorkspaceUuid)
    expect(canOpen()).toBe(false)
  })

  it('invalidates the capability when the account UUID or client model changes', () => {
    jest.mocked(getCurrentAccount).mockReturnValue({ ...account, uuid: 'other-account' as Core.AccountUuid })
    expect(canOpen()).toBe(false)
    jest.mocked(getCurrentAccount).mockReturnValue(account)
    const client = { getModel: () => ({ findAllSync }) }
    jest.mocked(getClient).mockReturnValue(client as unknown as ReturnType<typeof getClient>)
    expect(canOpen()).toBe(false)
  })

  it('allows a fresh modified gesture after a same-UUID profile replacement', async () => {
    jest.mocked(getCurrentAccount).mockReturnValue({ ...account })
    const href = 'https://huly.example/workbench/workspace/tracker/PROJ-123'
    setMetadata(presentation.metadata.FrontUrl, 'https://huly.example')
    setMetadata(uiPlugin.metadata.Routes, new Map([['workbench', 'workbench:component:WorkbenchApp' as AnyComponent]]))
    jest.mocked(parseLocation).mockReturnValue(loc)
    jest.mocked(hasResource).mockReturnValue(true)
    jest.mocked(getResource).mockResolvedValue(async (target: Location) => {
      await openWorkbenchTab(target, loadData)
    })
    // Synthetic mouse fields; native/Svelte dispatch and browser tabs are not run.
    const event = Object.assign(new Event('click', { cancelable: true }), {
      button: 0,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false
    }) as MouseEvent

    await handleNewTabClick(event, { href, disabled: false })

    expect(event.defaultPrevented).toBe(true)
    expect(getResource).toHaveBeenCalledWith('workbench:function:OpenInNewTab')
    expect(createDoc).toHaveBeenCalledTimes(1)
    expect(createDoc).toHaveBeenCalledWith('workbench:class:WorkbenchTab', Core.default.space.Workspace, {
      attachedTo: account.uuid,
      location: 'workbench/workspace/tracker/PROJ-123',
      isPinned: false,
      name: 'PROJ-123'
    })
  })

  it('keeps the provider used by the existing OpenInNewTab action usable after a same-UUID profile replacement', async () => {
    jest.mocked(getCurrentAccount).mockReturnValue({ ...account })

    // Call the actual resource resolved by the existing action, including its
    // metadata helper and opener. This checks the resource, not the menu UI.
    await OpenInNewTab(loc)

    expect(canOpen()).toBe(true)
    expect(createDoc).toHaveBeenCalledTimes(1)
    expect(createDoc).toHaveBeenCalledWith('workbench:class:WorkbenchTab', Core.default.space.Workspace, {
      attachedTo: account.uuid,
      location: 'workbench/workspace/tracker/PROJ-123',
      isPinned: false,
      name: 'Translated tab'
    })
  })

  it('removes and invalidates the capability when the workbench unmounts', () => {
    const capability = getMetadata(presentation.metadata.CanOpenInNewTab)
    unregister()
    expect(canOpen()).toBeUndefined()
    expect(capability?.(loc)).toBe(false)
  })

  it('keeps a newer shell registration when an older shell unmounts', () => {
    const unregisterNew = registerWorkbenchTabNavigation()
    try {
      unregister()
      expect(canOpen()).toBe(true)
    } finally {
      unregisterNew()
    }
    expect(canOpen()).toBeUndefined()
  })

  it('writes a tab with the initiating account and passes its client to metadata loading', async () => {
    const client = getClient()
    await openWorkbenchTab(loc, loadData)

    expect(loadData).toHaveBeenCalledWith(loc, client)
    expect(createDoc).toHaveBeenCalledTimes(1)
    expect(createDoc).toHaveBeenCalledWith('workbench:class:WorkbenchTab', Core.default.space.Workspace, {
      attachedTo: account.uuid,
      location: 'workbench/workspace/tracker/PROJ-123',
      isPinned: false,
      name: 'PROJ-123'
    })
    expect(translate).not.toHaveBeenCalled()
  })

  it('writes the translated fallback label while the initiating registration remains valid', async () => {
    loadData.mockResolvedValueOnce({ label })
    await openWorkbenchTab(loc, loadData)

    expect(translate).toHaveBeenCalledWith(label, {}, 'en')
    expect(createDoc).toHaveBeenCalledTimes(1)
    expect(createDoc).toHaveBeenCalledWith('workbench:class:WorkbenchTab', Core.default.space.Workspace, {
      attachedTo: account.uuid,
      location: 'workbench/workspace/tracker/PROJ-123',
      isPinned: false,
      name: 'Translated tab'
    })
  })

  it('does not load metadata or write without a live shell capability', async () => {
    unregister()
    await openWorkbenchTab(loc, loadData)

    expect(loadData).not.toHaveBeenCalled()
    expect(createDoc).not.toHaveBeenCalled()
  })

  async function invalidate (change: string): Promise<() => void> {
    if (change === 'teardown') unregister()
    if (change === 'session') await onConnect(Core.ClientConnectEvent.Reconnected, 'initial-tx', 'new-session')
    if (change === 'token') setMetadata(presentation.metadata.Token, 'new-token')
    if (change === 'workspace identity') {
      setMetadata(presentation.metadata.WorkspaceUuid, 'new-workspace' as Core.WorkspaceUuid)
    }
    if (change === 'workspace route') {
      jest.mocked(getCurrentLocation).mockReturnValue({ path: ['workbench', 'new-workspace', 'tracker'] })
    }
    if (change === 'account') {
      jest.mocked(getCurrentAccount).mockReturnValue({ ...account, uuid: 'replacement-account' as Core.AccountUuid })
    }
    if (change === 'client') {
      const oldClient = getClient()
      const client = { getModel: () => oldClient.getModel(), createDoc }
      jest.mocked(getClient).mockReturnValue(client as unknown as ReturnType<typeof getClient>)
    }
    if (change === 'model') {
      // getClient is a stable proxy in production; changing the backing model must
      // invalidate work even when the client reference itself remains identical.
      jest.spyOn(getClient(), 'getModel').mockReturnValue({ findAllSync } as unknown as Core.ModelDb)
    }
    if (change === 'role') account.role = AccountRole.ReadOnlyGuest
    if (change === 'new shell') return registerWorkbenchTabNavigation()
    return () => {}
  }

  describe.each(['metadata/title', 'translation'])('pending %s', (stage) => {
    it.each([
      'teardown',
      'session',
      'token',
      'workspace identity',
      'workspace route',
      'account',
      'client',
      'model',
      'role',
      'new shell'
    ])('does not write after a change of %s', async (change) => {
      const started = deferred<undefined>()
      const metadata = deferred<{ name?: string, label: Platform.IntlString }>()
      const translation = deferred<string>()
      if (stage === 'metadata/title') {
        loadData.mockImplementationOnce(async () => {
          started.resolve(undefined)
          return await metadata.promise
        })
      } else {
        loadData.mockResolvedValueOnce({ label })
        jest.mocked(translate).mockImplementationOnce(async () => {
          started.resolve(undefined)
          return await translation.promise
        })
      }

      const pending = openWorkbenchTab(loc, loadData)
      await started.promise
      const cleanup = await invalidate(change)
      try {
        metadata.resolve({ name: 'Obsolete title', label })
        translation.resolve('Obsolete translation')
        await pending
        expect(createDoc).not.toHaveBeenCalled()
        if (stage === 'metadata/title') expect(translate).not.toHaveBeenCalled()
      } finally {
        cleanup()
      }
    })

    it.each(['profile replacement', 'same-session reconnect'])(
      'allows the pending write and a fresh open after %s',
      async (change) => {
        const started = deferred<undefined>()
        const metadata = deferred<{ name?: string, label: Platform.IntlString }>()
        const translation = deferred<string>()
        if (stage === 'metadata/title') {
          loadData.mockImplementationOnce(async () => {
            started.resolve(undefined)
            return await metadata.promise
          })
        } else {
          loadData.mockResolvedValueOnce({ label })
          jest.mocked(translate).mockImplementationOnce(async () => {
            started.resolve(undefined)
            return await translation.promise
          })
        }

        const pending = openWorkbenchTab(loc, loadData)
        await started.promise
        if (change === 'profile replacement') {
          jest.mocked(getCurrentAccount).mockReturnValue({ ...account })
        } else {
          await onConnect(Core.ClientConnectEvent.Reconnected, 'later-tx', 'session')
        }
        metadata.resolve({ name: 'Still valid', label })
        translation.resolve('Still valid')
        await pending
        expect(createDoc).toHaveBeenCalledTimes(1)

        await openWorkbenchTab(loc, loadData)
        expect(createDoc).toHaveBeenCalledTimes(2)
      }
    )
  })
})
