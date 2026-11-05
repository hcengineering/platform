// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { AccountUuid } from '@hcengineering/core'
import { createDefinitionPackageRelease, serializeDefinitionPackageRelease } from '@hcengineering/marketplace'
import { readFileSync } from 'fs'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { CatalogError } from '../errors'
import { createCatalogServer, type CatalogServerOptions } from '../server'
import type { CatalogStore } from '../store'

const author = '267c1923-5983-4ab0-ac89-82f481836724' as AccountUuid
const headers = { Authorization: 'Bearer account-token' }

// These tests exercise real middleware and HTTP requests without contacting the account service or storage.
describe('Marketplace request quotas', () => {
  let server: Server | undefined
  let url: string
  let source: string
  const authenticate = jest.fn(async (token: string) => {
    if (token !== 'account-token') throw new CatalogError(401, 'Invalid token')
    return { uuid: author, name: 'Author' }
  })
  const store: jest.Mocked<CatalogStore> = {
    list: jest.fn(),
    get: jest.fn(),
    readers: jest.fn(),
    grantRead: jest.fn(),
    revokeRead: jest.fn(),
    transferOwnership: jest.fn(),
    setVisibility: jest.fn(),
    releases: jest.fn(),
    download: jest.fn(),
    publish: jest.fn()
  }
  const onError = jest.fn()

  async function start (
    limits: Pick<CatalogServerOptions, 'requestLimit' | 'publicationLimit' | 'trustedProxies'>
  ): Promise<void> {
    server = createCatalogServer({
      store,
      authenticate,
      onError,
      resolveRecipient: async () => author,
      ...limits
    }).listen(0, '127.0.0.1')
    await new Promise<void>((resolve, reject) => {
      server?.once('listening', resolve)
      server?.once('error', reject)
    })
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  beforeAll(async () => {
    const definition = readFileSync(
      `${__dirname}/../../../../plugins/process/docs/examples/review-task.process.yaml`,
      'utf8'
    )
    source = serializeDefinitionPackageRelease(
      await createDefinitionPackageRelease({
        package: { id: 'acme/review', version: '1.0.0', author },
        source: definition
      })
    )
  })
  beforeEach(() => {
    jest.clearAllMocks()
    store.list.mockResolvedValue({ items: [] })
    store.releases.mockResolvedValue({ items: [] })
    store.download.mockResolvedValue(source)
    store.publish.mockResolvedValue({
      id: 'acme/review',
      author,
      version: '1.0.0',
      contentHash: 'digest',
      publishedOn: 1
    })
  })
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error !== undefined) reject(error)
        else resolve()
      })
    })
    server = undefined
  })

  it('shares the request budget across catalog routes and blocks before authorization', async () => {
    await start({ requestLimit: 2 })
    expect((await fetch(`${url}/packages`, { headers })).status).toBe(200)
    expect((await fetch(`${url}/release?id=acme/review&author=${author}`, { headers })).status).toBe(200)
    const blocked = await fetch(`${url}/releases?id=acme/review&author=${author}`, { headers })
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ message: 'Too many Marketplace requests; please try again later' })
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(blocked.headers.get('RateLimit')).toContain('limit=2')
    expect(authenticate).toHaveBeenCalledTimes(2)
    expect(store.releases).not.toHaveBeenCalled()
  })

  it('counts invalid and changing credentials against the same IP budget', async () => {
    await start({ requestLimit: 2 })
    expect((await fetch(`${url}/packages`, { headers: { Authorization: 'Bearer wrong-token' } })).status).toBe(401)
    expect((await fetch(`${url}/packages`, { headers: { Authorization: 'Bearer another-token' } })).status).toBe(401)
    expect((await fetch(`${url}/packages`, { headers })).status).toBe(429)
    expect(authenticate).toHaveBeenCalledTimes(2)
    expect(store.list).not.toHaveBeenCalled()
  })

  it('limits publications before authentication and YAML parsing while keeping catalog reads available', async () => {
    await start({ requestLimit: 10, publicationLimit: 1 })
    const publicationHeaders = { ...headers, 'Content-Type': 'application/yaml' }
    expect((await fetch(`${url}/releases`, { method: 'POST', headers: publicationHeaders, body: source })).status).toBe(
      201
    )
    const blocked = await fetch(`${url}/releases`, {
      method: 'POST',
      headers: publicationHeaders,
      body: 'invalid YAML'
    })
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ message: 'Too many package publications; please try again later' })
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(authenticate).toHaveBeenCalledTimes(1)
    expect(store.publish).toHaveBeenCalledTimes(1)
    expect((await fetch(`${url}/packages`, { headers })).status).toBe(200)
    expect(onError).not.toHaveBeenCalled()
  })

  it('keeps readiness checks and CORS preflights outside the authentication quota', async () => {
    await start({ requestLimit: 1 })
    for (let index = 0; index < 3; index++) {
      expect((await fetch(`${url}/health`)).status).toBe(200)
      const preflight = await fetch(`${url}/releases`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://workspace.example.test',
          'Access-Control-Request-Method': 'POST'
        }
      })
      expect(preflight.status).toBe(204)
    }
    expect((await fetch(`${url}/packages`, { headers })).status).toBe(200)
    expect((await fetch(`${url}/packages`, { headers })).status).toBe(429)
    expect((await fetch(`${url}/health`)).status).toBe(200)
    expect(authenticate).toHaveBeenCalledTimes(1)
  })

  it('ignores forwarded IPs from a peer outside the configured trusted proxies', async () => {
    await start({ requestLimit: 1, trustedProxies: ['192.0.2.1'] })
    const first = await fetch(`${url}/packages`, { headers: { ...headers, 'X-Forwarded-For': '203.0.113.10' } })
    const second = await fetch(`${url}/packages`, { headers: { ...headers, 'X-Forwarded-For': '203.0.113.11' } })
    expect(first.status).toBe(200)
    expect(second.status).toBe(429)
    expect(authenticate).toHaveBeenCalledTimes(1)
  })

  it('uses distinct client budgets when forwarding comes from an explicitly trusted proxy', async () => {
    await start({ requestLimit: 1, trustedProxies: ['loopback'] })
    const first = { ...headers, 'X-Forwarded-For': '203.0.113.10' }
    const second = { ...headers, 'X-Forwarded-For': '203.0.113.11' }
    expect((await fetch(`${url}/packages`, { headers: first })).status).toBe(200)
    expect((await fetch(`${url}/packages`, { headers: second })).status).toBe(200)
    expect((await fetch(`${url}/packages`, { headers: first })).status).toBe(429)
    expect(authenticate).toHaveBeenCalledTimes(2)
  })
})
