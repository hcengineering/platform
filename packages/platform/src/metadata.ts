//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { Id } from './platform'

/**
 * Platform Metadata Identifier (PMI).
 *
 * 'Metadata' is simply any JavaScript object, which is used to configure platform, e.g. IP addresses.
 * Another example of metadata is an asset URL. The logic behind providing asset URLs as metadata is
 * we know URL at compile time only and URLs vary depending on deployment options.
 *
 * @public
 */
export type Metadata<T> = Id & { __metadata: T }

/**
 * @public
 */
export type ExtractType<T, X extends Record<string, Metadata<T>>> = {
  [P in keyof X]: X[P] extends Metadata<infer Z> ? Z : never
}

const metadata = new Map<Metadata<any>, any>()

/**
 * @public
 * @param id -
 * @returns
 */
export function getMetadata<T> (id: Metadata<T>): T | undefined {
  return metadata.get(id)
}

/**
 * @public
 * @param id -
 * @param value -
 */
export function setMetadata<T> (id: Metadata<T>, value: T): void {
  metadata.set(id, value)
}

/**
 * @public
 * @param ids -
 * @param data -
 */
export function loadMetadata<T, X extends Record<string, Metadata<T>>> (ids: X, data: ExtractType<T, X>): void {
  for (const key in ids) {
    const id = ids[key]
    const resource = data[key]
    if (resource === undefined) {
      throw new Error(`no metadata provided, key: ${key}, id: ${String(id)}`)
    }
    metadata.set(id, resource)
  }
}
