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

import type {
  CatalogPackage,
  CatalogPackageIdentity,
  CatalogPackageReader,
  CatalogPackageVisibility,
  CatalogPage,
  CatalogRelease,
  CatalogSearch
} from './catalog-types'

export class MarketplaceError extends Error {
  constructor (
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'MarketplaceError'
  }
}

/** Transport for the standalone Marketplace pod. Release bodies remain plain package YAML. */
export class MarketplaceClient {
  constructor (
    private readonly url: string,
    private readonly token: string
  ) {}

  private async request (path: string, query: Record<string, string> = {}, init?: RequestInit): Promise<Response> {
    const url = new URL(`${this.url.replace(/\/$/, '')}/${path}`)
    url.search = new URLSearchParams(query).toString()
    const response = await fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${this.token}` }
    })
    if (!response.ok) {
      let message = `Marketplace request failed (${response.status})`
      try {
        const error: unknown = await response.json()
        if (error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
          message = error.message
        }
      } catch {
        // Proxies may return an HTML error instead of the pod's JSON response.
      }
      throw new MarketplaceError(response.status, message)
    }
    return response
  }

  async list (options: CatalogSearch = {}): Promise<CatalogPage<CatalogPackage>> {
    const query: Record<string, string> = {}
    if (options.search !== undefined) query.search = options.search
    if (options.mine === true) query.mine = 'true'
    if (options.offset !== undefined) query.offset = String(options.offset)
    if (options.limit !== undefined) query.limit = String(options.limit)
    return await (await this.request('packages', query)).json()
  }

  async releases (identity: CatalogPackageIdentity, offset = 0): Promise<CatalogPage<CatalogRelease>> {
    return await (await this.request('releases', { ...identity, offset: String(offset) })).json()
  }

  /** Read package metadata using the same visibility rules as release downloads. */
  async get (identity: CatalogPackageIdentity): Promise<CatalogPackage> {
    return await (await this.request('package', { ...identity })).json()
  }

  /** Change visibility for all releases; only the current package owner may do so. */
  async setVisibility (identity: CatalogPackageIdentity, visibility: CatalogPackageVisibility): Promise<void> {
    await this.request(
      'package',
      { ...identity },
      {
        method: 'PATCH',
        headers: { 'X-Marketplace-Visibility': visibility }
      }
    )
  }

  async download (identity: CatalogPackageIdentity, version?: string): Promise<string> {
    return await (await this.request('release', { ...identity, ...(version === undefined ? {} : { version }) })).text()
  }

  /** List explicit readers; only the current owner can inspect the access list. */
  async readers (identity: CatalogPackageIdentity): Promise<CatalogPackageReader[]> {
    return await (await this.request('package/access', { ...identity })).json()
  }

  /** Grant read access to a registered account identified by its verified email. */
  async grantRead (identity: CatalogPackageIdentity, email: string): Promise<void> {
    await this.request(
      'package/access',
      { ...identity },
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }
    )
  }

  /** Revoke future catalog access without affecting previously downloaded files or installations. */
  async revokeRead (identity: CatalogPackageIdentity, account: string): Promise<void> {
    await this.request('package/access', { ...identity, account }, { method: 'DELETE' })
  }

  /** Transfer management and publication rights while retaining the immutable author/package identity. */
  async transferOwnership (identity: CatalogPackageIdentity, email: string): Promise<void> {
    await this.request(
      'package/owner',
      { ...identity },
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }
    )
  }

  async publish (source: string, contactEmail = '', visibility?: CatalogPackageVisibility): Promise<CatalogRelease> {
    return await (
      await this.request(
        'releases',
        {},
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/yaml',
            'X-Marketplace-Contact-Email': contactEmail,
            ...(visibility === undefined ? {} : { 'X-Marketplace-Visibility': visibility })
          },
          body: source
        }
      )
    ).json()
  }
}
