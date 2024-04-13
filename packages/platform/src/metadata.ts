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
 * Another example of metadata is an asset URL. Asset URLs are provided as metadata because they are
 * known only at compile time and can vary depending on deployment options.
 *
 * @public
 */
export type Metadata<T> = Id & { __metadata: T }

/**
 * @public
 * @typedef ExtractType
 * 
 * A utility type that extracts the metadata type from a record of metadata.
 */
export type ExtractType<T, X extends Record<string, Metadata<T>>> = {
  [P in keyof X]: X[P] extends Metadata<infer Z> ? Z : never
}

// Map to store metadata
const metadata = new Map<Metadata<any>, any>()

/**
 * @public
 * @function getMetadata
 * 
 * Retrieves the metadata associated with a given ID.
 * 
 * @param id - The ID of the metadata to retrieve.
 * @returns {T | undefined} - The metadata associated with the ID, or undefined if no metadata is found.
 */
export function getMetadata<T> (id: Metadata<T>): T | undefined {
  return metadata.get(id)
}

/**
 * @public
 * @function setMetadata
 * 
 * Sets the metadata for a given ID.
 * 
 * @param id - The ID to associate the metadata with.
 * @param value - The metadata to set.
 */
export function setMetadata<T> (id: Metadata<T>, value: T): void {
  metadata.set(id, value)
}

/**
 * @public
 * @function loadMetadata
 * 
 * Loads a set of metadata into the map.
 * 
 * @param ids - The IDs of the metadata to load.
 * @param data - The metadata to load.
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
