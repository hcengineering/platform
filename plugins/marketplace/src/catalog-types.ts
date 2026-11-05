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

/** Catalog identities are scoped to an authenticated global account. */
export interface CatalogPackageIdentity {
  id: string
  author: AccountUuid
}

export type CatalogPackageVisibility = 'public' | 'private'

export interface CatalogPackage extends CatalogPackageIdentity {
  visibility: CatalogPackageVisibility
  name: string
  description: string
  kind: 'card' | 'process'
  version: string
  authorName: string
  contactEmail?: string
  publishedOn: number
}

export interface CatalogRelease extends CatalogPackageIdentity {
  version: string
  contentHash: string
  publishedOn: number
}

export interface CatalogPage<T> {
  items: T[]
  nextOffset?: number
}

export interface CatalogSearch {
  search?: string
  mine?: boolean
  offset?: number
  limit?: number
}
