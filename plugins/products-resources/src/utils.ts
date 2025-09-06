//
// Copyright © 2024 Hardcore Engineering Inc.
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

import core, {
  type WithLookup,
  type Client,
  type Ref,
  type Space,
  checkPermission,
  getCurrentAccount
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { type KeyFilter } from '@hcengineering/view'
import documents from '@hcengineering/controlled-documents'
import products, { ProductVersionState, type Product, type ProductVersion } from '@hcengineering/products'

export function getProductVersionVersion (doc: ProductVersion): string {
  const codename = doc.codename ?? ''
  const version = `${doc.major}.${doc.minor}`

  return codename !== '' ? `${version} ${codename}` : version
}

export function getProductVersionName (doc: ProductVersion, product: Product): string {
  const version = getProductVersionVersion(doc)
  return `${product.name} ${version}`
}

export async function getVisibleFilters (filters: KeyFilter[], space?: Ref<Space>): Promise<KeyFilter[]> {
  return filters.filter((f) => f.key !== core.role.Admin)
}

export async function canEditProduct (doc?: Product): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }

  if ((doc.owners ?? []).includes(getCurrentAccount().uuid)) {
    return true
  }

  const client = getClient()

  if (await checkPermission(client, core.permission.UpdateObject, core.space.Space)) {
    return true
  }

  if (await checkPermission(client, core.permission.UpdateSpace, doc._id)) {
    return true
  }

  return false
}

export async function canEditProductVersion (doc?: WithLookup<ProductVersion>): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }

  if (doc.state === ProductVersionState.Released) {
    return false
  }

  const product = await getClient().findOne(products.class.Product, { _id: doc.space })
  if (product === undefined) {
    return false
  }
  return await canEditProduct(product)
}

export async function canDeleteProductVersion (doc?: ProductVersion | ProductVersion[]): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }

  if (Array.isArray(doc)) {
    return false
  }

  if (doc.state === ProductVersionState.Released) {
    return false
  }

  const client = getClient()

  const anychild = await client.findOne(products.class.ProductVersion, { parent: doc._id })
  if (anychild !== undefined) {
    return false
  }

  const anydoc = await client.findOne(documents.class.ProjectDocument, { project: doc._id, initial: doc._id })
  if (anydoc !== undefined) {
    return false
  }

  const product = await client.findOne(products.class.Product, { _id: doc.space })
  if (product !== undefined) {
    return await canEditProduct(product)
  }

  return false
}

export async function productIdentifierProvider (client: Client, ref: Ref<Product>, doc?: Product): Promise<string> {
  const object = doc ?? (await client.findOne(products.class.Product, { _id: ref }))

  if (object === undefined) {
    return ''
  }

  return object.name
}
