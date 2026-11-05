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
import { PostgresCatalogStore, type CatalogPublication } from '../store'

// Point only at a disposable database; these tests never use the service's DB_URL.
const databaseUrl = process.env.MARKETPLACE_TEST_DB_URL
const integration = databaseUrl === undefined ? describe.skip : describe
const author = '267c1923-5983-4ab0-ac89-82f481836724' as AccountUuid
const other = 'ac842ec2-bd9e-4f51-86ef-ce1393386348' as AccountUuid

integration('Marketplace PostgreSQL release storage', () => {
  let store: PostgresCatalogStore
  let publication: CatalogPublication
  beforeAll(async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('/tracex_marketplace_test')) {
      throw new Error('Use a disposable tracex_marketplace_test database')
    }
    store = new PostgresCatalogStore(databaseUrl)
    await store.init()
  })
  afterAll(async () => {
    await store?.close()
  })
  beforeEach(() => {
    publication = {
      id: `local/test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author,
      name: 'Process bundle',
      description: 'A % literal _ search',
      kind: 'process',
      version: '1.0.0',
      authorName: 'Author',
      publishedOn: Date.now(),
      contentHash: 'sha256:original',
      source: 'original YAML'
    }
  })

  it('keeps old release bytes and selects the newest release', async () => {
    await store.publish(publication)
    await store.publish({ ...publication, version: '1.0.1', contentHash: 'sha256:updated', source: 'updated YAML' })
    expect(await store.download(publication, author, '1.0.0')).toBe('original YAML')
    expect(await store.download(publication, author)).toBe('updated YAML')
    expect((await store.releases(publication, author, 0)).items.map((release) => release.version)).toEqual(['1.0.1', '1.0.0'])
  })

  it('accepts identical retries without changing the publication timestamp', async () => {
    const first = await store.publish(publication)
    expect(await store.publish({ ...publication, publishedOn: publication.publishedOn + 100 })).toEqual(first)
    expect((await store.releases(publication, author, 0)).items).toHaveLength(1)
  })

  it('rejects replacing content, kind changes, downgrades and equal SemVer precedence', async () => {
    await store.publish(publication)
    await expect(store.publish({ ...publication, contentHash: 'different' })).rejects.toMatchObject({ status: 409 })
    await expect(store.publish({ ...publication, version: '1.0.1', kind: 'card' })).rejects.toMatchObject({
      status: 409
    })
    await expect(store.publish({ ...publication, version: '0.9.0' })).rejects.toMatchObject({ status: 409 })
    await expect(store.publish({ ...publication, version: '1.0.0+changed' })).rejects.toMatchObject({ status: 409 })
    expect(await store.download(publication, author)).toBe('original YAML')
  })

  it('scopes package IDs to their real authors', async () => {
    await store.publish(publication)
    await store.publish({ ...publication, author: other, source: 'other author' })
    expect(await store.download(publication, author)).toBe('original YAML')
    expect(await store.download({ ...publication, author: other }, other)).toBe('other author')
  })

  it('serializes concurrent first publications and never replaces a version', async () => {
    const results = await Promise.allSettled([
      store.publish(publication),
      store.publish({ ...publication, contentHash: 'different', source: 'different YAML' })
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect((await store.releases(publication, author, 0)).items).toHaveLength(1)
  })

  it('keeps the greatest SemVer latest under concurrent upgrades', async () => {
    await store.publish(publication)
    await Promise.allSettled(
      ['1.0.1', '1.0.2', '1.0.3'].map(async (version) => {
        await store.publish({ ...publication, version, source: version, contentHash: version })
      })
    )
    expect(await store.download(publication, author)).toBe('1.0.3')
  })

  it('searches literal text, filters authors and exposes optional contact only when supplied', async () => {
    await store.publish(publication)
    const page = await store.list({ viewer: author, search: '% literal _', author, offset: 0, limit: 100 })
    expect(page.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: publication.id })]))
    expect(page.items.find((entry) => entry.id === publication.id)?.contactEmail).toBeUndefined()
    expect(
      (await store.list({ viewer: author, search: publication.name, author: other, offset: 0, limit: 100 })).items.every(
        (entry) => entry.author === other
      )
    ).toBe(true)
    await expect(store.download({ ...publication, id: 'local/missing' }, author)).rejects.toMatchObject({ status: 404 })
  })

  it('keeps legacy publications public and initializes the visibility schema repeatedly', async () => {
    await store.publish(publication)
    await store.init()
    expect((await store.get(publication, other)).visibility).toBe('public')
    expect(await store.download(publication, other)).toBe('original YAML')
    expect((await store.releases(publication, other, 0)).items).toHaveLength(1)
  })

  it('hides private packages and every release from other accounts, including direct requests', async () => {
    await store.publish({ ...publication, visibility: 'private' })
    await store.publish({ ...publication, version: '1.0.1', source: 'updated YAML', contentHash: 'sha256:updated' })
    expect((await store.get(publication, author)).visibility).toBe('private')
    expect(await store.download(publication, author)).toBe('updated YAML')
    expect(await store.download(publication, author, '1.0.0')).toBe('original YAML')
    expect((await store.releases(publication, author, 0)).items).toHaveLength(2)
    for (const mine of [false, true]) {
      const page = await store.list({ viewer: other, search: '', author: mine ? author : undefined, offset: 0, limit: 100 })
      expect(page.items.some((entry) => entry.id === publication.id && entry.author === author)).toBe(false)
    }
    const own = await store.list({ viewer: author, search: '', author, offset: 0, limit: 100 })
    expect(own.items).toContainEqual(expect.objectContaining({ id: publication.id, visibility: 'private' }))
    await expect(store.get(publication, other)).rejects.toMatchObject({ status: 404 })
    await expect(store.releases(publication, other, 0)).rejects.toMatchObject({ status: 404 })
    await expect(store.download(publication, other)).rejects.toMatchObject({ status: 404 })
    await expect(store.download(publication, other, '1.0.0')).rejects.toMatchObject({ status: 404 })
    await expect(store.setVisibility(publication, other, 'public')).rejects.toMatchObject({ status: 404 })
    expect((await store.get(publication, author)).visibility).toBe('private')
  })

  it('lets only the author switch visibility for the whole package without creating releases', async () => {
    await store.publish(publication)
    await store.setVisibility(publication, author, 'private')
    await expect(store.download(publication, other)).rejects.toMatchObject({ status: 404 })
    expect((await store.releases(publication, author, 0)).items).toHaveLength(1)
    await store.setVisibility(publication, author, 'public')
    expect(await store.download(publication, other)).toBe('original YAML')
    expect((await store.get(publication, other)).publishedOn).toBe(publication.publishedOn)
    await expect(store.setVisibility({ ...publication, id: 'local/missing' }, author, 'private')).rejects.toMatchObject({ status: 404 })
  })

  it('preserves privacy on retries from older clients and applies explicit visibility even on an identical retry', async () => {
    const first = await store.publish({ ...publication, visibility: 'private' })
    expect(await store.publish(publication)).toEqual(first)
    await expect(store.get(publication, other)).rejects.toMatchObject({ status: 404 })
    await expect(store.publish({ ...publication, contentHash: 'tampered', visibility: 'public' })).rejects.toMatchObject({ status: 409 })
    await expect(store.get(publication, other)).rejects.toMatchObject({ status: 404 })
    expect(await store.publish({ ...publication, visibility: 'public' })).toEqual(first)
    expect((await store.get(publication, other)).visibility).toBe('public')
    expect((await store.releases(publication, other, 0)).items).toHaveLength(1)
  })

  it('applies visibility before pagination so hidden packages do not consume visible slots', async () => {
    const search = publication.id
    await store.publish({ ...publication, name: search })
    await store.publish({ ...publication, author: other, name: search, visibility: 'private', publishedOn: publication.publishedOn + 1 })
    const page = await store.list({ viewer: author, search, offset: 0, limit: 1 })
    expect(page.items).toHaveLength(1)
    expect(page.items[0].author).toBe(author)
    expect(page.nextOffset).toBeUndefined()
  })
})
