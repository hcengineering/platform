//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type AccountUuid } from '@hcengineering/core'
import { getClient } from '../client'

describe('AccountClient admin methods', () => {
  const accountUuid = 'a1111111-1111-4111-9111-111111111111' as AccountUuid
  let fetchMock: jest.Mock
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    fetchMock = jest.fn(async () => ({ json: async () => ({ result: { ok: true } }) }))
    globalThis.fetch = fetchMock as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function sentRequest (): any {
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://account')
    expect(init.headers.Authorization).toBe('Bearer admin-token')
    return JSON.parse(init.body)
  }

  it.each(['disableAccount', 'enableAccount'] as const)('%s sends the account uuid', async (method) => {
    const client = getClient('http://account', 'admin-token')
    await expect(client[method](accountUuid)).resolves.toEqual({ ok: true })
    expect(sentRequest()).toEqual({ method, params: { accountUuid } })
  })
})
