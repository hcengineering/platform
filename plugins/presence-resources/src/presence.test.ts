//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { AccountRole, setCurrentAccount, type Account, type AccountUuid } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { restrictionStore } from '@hcengineering/view-resources'
import { canSendPulse, updatePresence, deletePresence, type PresenceInfo } from './presence'
import type * as SvelteStore from 'svelte/store'

jest.mock('svelte/store', () => jest.requireActual('../../../packages/presentation/src/__mocks__/svelte-store'))
jest.mock('@hcengineering/presentation', () => ({ getClient: jest.fn(), createQuery: jest.fn() }))
jest.mock('@hcengineering/view-resources', () => {
  const store = jest.requireMock<typeof SvelteStore>('svelte/store')
  return { restrictionStore: store.writable({ readonly: false }) }
})

describe('presence in read-only views', () => {
  function account (role: AccountRole): Account {
    const value: Account = {
      uuid: 'user' as AccountUuid,
      role,
      primarySocialId: '' as Account['primarySocialId'],
      socialIds: [],
      fullSocialIds: []
    }
    return value
  }

  beforeEach(() => {
    jest.clearAllMocks()
    restrictionStore.update((value) => ({ ...value, readonly: false }))
    setCurrentAccount(account(AccountRole.User))
  })

  it('allows presence for an ordinary writable user', () => {
    expect(canSendPulse()).toBe(true)
  })

  it('blocks presence when the current view is read-only', () => {
    restrictionStore.update((value) => ({ ...value, readonly: true }))
    expect(canSendPulse()).toBe(false)
  })

  it.each([AccountRole.DocGuest, AccountRole.ReadOnlyGuest])('blocks the read-only account role %s', (role) => {
    setCurrentAccount(account(role))
    expect(canSendPulse()).toBe(false)
  })

  it('does not access the client to update or delete presence in a read-only view', async () => {
    restrictionStore.update((value) => ({ ...value, readonly: true }))
    const info: PresenceInfo = {
      personId: '' as PresenceInfo['personId'],
      objectId: 'document',
      objectClass: '' as PresenceInfo['objectClass'],
      space: '' as PresenceInfo['space']
    }
    await updatePresence(info)
    await deletePresence(info)
    expect(getClient).not.toHaveBeenCalled()
  })
})
