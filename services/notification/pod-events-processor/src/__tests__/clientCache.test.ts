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

import type { PersonId, WorkspaceUuid } from '@hcengineering/core'
import type { ClientBundle } from '../client'
import {
  clearClientCachesForTests,
  clearInFlightClientCreation,
  getCacheKey,
  getCachedClient,
  getInFlightClientCreation,
  setCachedClient,
  setInFlightClientCreation
} from '../clientCache'
import config from '../config'

describe('clientCache', () => {
  const workspace = 'workspace-1' as WorkspaceUuid
  const serviceTag = 'events-processor'
  const socialId = 'person-1' as PersonId

  const client = {} as unknown as ClientBundle['client']
  const accountClient = {} as unknown as ClientBundle['accountClient']
  const bundle: ClientBundle = { client, accountClient }

  beforeEach(() => {
    clearClientCachesForTests()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses system marker in cache key when socialId is undefined', () => {
    expect(getCacheKey(workspace, undefined, serviceTag)).toBe('workspace-1:system:events-processor')
  })

  it('returns cached value before ttl expires', () => {
    const now = 1_000
    jest.spyOn(Date, 'now').mockReturnValue(now)

    setCachedClient(workspace, socialId, serviceTag, bundle)
    expect(getCachedClient(workspace, socialId, serviceTag)).toBe(bundle)
  })

  it('evicts cached value after ttl expires', () => {
    const now = 1_000
    jest.spyOn(Date, 'now').mockReturnValue(now)
    setCachedClient(workspace, socialId, serviceTag, bundle)

    jest.spyOn(Date, 'now').mockReturnValue(now + config.ClientCacheTtlMs + 1)
    expect(getCachedClient(workspace, socialId, serviceTag)).toBeUndefined()
  })

  it('stores and clears in-flight client creation', () => {
    const key = getCacheKey(workspace, socialId, serviceTag)
    const creation = Promise.resolve(bundle)

    setInFlightClientCreation(key, creation)
    expect(getInFlightClientCreation(key)).toBe(creation)

    clearInFlightClientCreation(key)
    expect(getInFlightClientCreation(key)).toBeUndefined()
  })
})
