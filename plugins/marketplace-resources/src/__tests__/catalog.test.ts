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
import marketplace, {
  createDefinitionPackageRelease,
  MarketplaceClient,
  serializeDefinitionPackageRelease,
  type CatalogPackage,
  type DefinitionPackageInfo
} from '@hcengineering/marketplace'
import { setMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import {
  downloadCatalogRelease,
  getDefinitionPackageExportItemsStore,
  getInstalledPackageVersions,
  getMarketplaceClient,
  hasMarketplace
} from '../catalog'
import type { DropdownIntlItem } from '@hcengineering/ui'

// eslint-disable-next-line @typescript-eslint/naming-convention -- Standard CommonJS runtime global.
declare const __dirname: string
const { readFileSync } = jest.requireActual<{ readFileSync: (path: string, encoding: 'utf8') => string }>('fs')

jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { Token: 'test:metadata:Token' } }
}))
const identity = { id: 'acme/review', author: '267c1923-5983-4ab0-ac89-82f481836724' as AccountUuid }
let source: string
let download: jest.SpiedFunction<MarketplaceClient['download']>
beforeAll(async () => {
  source = serializeDefinitionPackageRelease(
    await createDefinitionPackageRelease({
      package: { ...identity, version: '1.0.0' },
      source: readFileSync(`${__dirname}/../../../process/docs/examples/review-task.process.yaml`, 'utf8')
    })
  )
})
beforeEach(() => {
  setMetadata(marketplace.metadata.Url, 'https://marketplace.example.test')
  setMetadata(presentation.metadata.Token, 'account-token')
  download = jest.spyOn(MarketplaceClient.prototype, 'download').mockImplementation(async () => source)
})
afterEach(() => {
  jest.restoreAllMocks()
  setMetadata(marketplace.metadata.Url, undefined)
  setMetadata(presentation.metadata.Token, undefined)
})

it('keeps the optional service separate from local file operations', () => {
  expect(hasMarketplace()).toBe(true)
  setMetadata(marketplace.metadata.Url, undefined)
  expect(hasMarketplace()).toBe(false)
  expect(() => getMarketplaceClient()).toThrow('not configured')
})

it('requires a current account token', () => {
  setMetadata(presentation.metadata.Token, undefined)
  expect(() => getMarketplaceClient()).toThrow('Authentication required')
})

it('does not mark another publisher or a legacy unattributed package as installed', () => {
  expect(
    getInstalledPackageVersions(identity, [
      { package: { ...identity, author: 'ac842ec2-bd9e-4f51-86ef-ce1393386348' as AccountUuid, version: '1.0.0' } },
      { package: { ...identity, id: 'acme/another', version: '1.0.0' } },
      { package: { id: identity.id, version: '1.0.0' } }
    ])
  ).toEqual([])
})

it('shows installed versions independently of the latest release and deduplicates separate instances', () => {
  const first = { package: { ...identity, version: '1.9.0' } }
  const second = { package: { ...identity, version: '1.10.0' } }
  expect(getInstalledPackageVersions(identity, [first, first, second])).toEqual(['1.10.0', '1.9.0'])
  expect(getInstalledPackageVersions(identity, [first])).toEqual(['1.9.0'])
  expect(getInstalledPackageVersions(identity, [])).toEqual([])
})

it('verifies the downloaded identity before opening an install or update', async () => {
  expect(await downloadCatalogRelease(identity, '1.0.0')).toBe(source)
  expect(download).toHaveBeenCalledWith(identity, '1.0.0')
})

it.each([
  { ...identity, id: 'acme/another' },
  { ...identity, author: 'ac842ec2-bd9e-4f51-86ef-ce1393386348' as AccountUuid }
])('rejects a release from a different identity %j', async (requested) => {
  await expect(downloadCatalogRelease(requested)).rejects.toThrow('does not match')
})

it('rejects the wrong version and tampered bytes', async () => {
  await expect(downloadCatalogRelease(identity, '1.0.1')).rejects.toThrow('does not match')
  download.mockResolvedValueOnce(source.replace('Review card', 'Tampered'))
  await expect(downloadCatalogRelease(identity)).rejects.toThrow('digest')
})

describe('catalog ownership in export menus', () => {
  const owner = 'ac842ec2-bd9e-4f51-86ef-ce1393386348' as AccountUuid
  const info: DefinitionPackageInfo = { ...identity, version: '1.0.0' }
  const entry: CatalogPackage = {
    ...identity,
    owner,
    visibility: 'private',
    name: 'Review',
    description: '',
    kind: 'process',
    version: '1.0.0',
    authorName: 'Original author',
    publishedOn: 1
  }

  it('offers a new version to the current owner and removes it from the original author', async () => {
    jest.spyOn(MarketplaceClient.prototype, 'get').mockResolvedValue(entry)
    let own: DropdownIntlItem[] = []
    let former: DropdownIntlItem[] = []
    const unsubscribeOwner = getDefinitionPackageExportItemsStore(info, owner).subscribe((items) => {
      own = items
    })
    const unsubscribeAuthor = getDefinitionPackageExportItemsStore(info, identity.author).subscribe((items) => {
      former = items
    })
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(own.map((item) => item.id)).toEqual(['new-package-version'])
    expect(former).toEqual([])
    unsubscribeOwner()
    unsubscribeAuthor()
  })

  it('does not give publication rights to a reader and preserves offline file creation', async () => {
    const readEntry: CatalogPackage = { ...entry, owner: identity.author }
    jest
      .spyOn(MarketplaceClient.prototype, 'get')
      .mockResolvedValueOnce(readEntry)
      .mockRejectedValueOnce(new Error('offline'))
    let reader: DropdownIntlItem[] = []
    let local: DropdownIntlItem[] = []
    const unsubscribeReader = getDefinitionPackageExportItemsStore(info, owner).subscribe((items) => {
      reader = items
    })
    const unsubscribeLocal = getDefinitionPackageExportItemsStore(info, identity.author).subscribe((items) => {
      local = items
    })
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(reader).toEqual([])
    expect(local.map((item) => item.id)).toEqual(['new-package-version'])
    unsubscribeReader()
    unsubscribeLocal()
  })
})
