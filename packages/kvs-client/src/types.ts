//
// Copyright © 2025 Hardcore Engineering Inc.
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

export interface ListResult {
  keys: string[]
  count: number
  namespace: string
}

/**
 * Client for interacting with the key-value store API
 * @public
 */
export interface KeyValueClient {
  /**
   * Store a value for a key in a namespace
   * @param key - The key to store the value under
   * @param value - The value to store
   * @returns Promise that resolves when the value is stored
   */
  setValue: <T>(key: string, value: T) => Promise<void>

  /**
   * Retrieve a value for a key in a namespace
   * @param key - The key to retrieve the value for
   * @returns Promise that resolves to the value, or null if not found
   */
  getValue: <T>(key: string) => Promise<T | null>

  /**
   * Delete a key-value pair in a namespace
   * @param key - The key to delete
   * @returns Promise that resolves when the key is deleted
   */
  deleteKey: (key: string) => Promise<void>

  /**
   * List all key-value pairs in a namespace, optionally filtered by prefix
   * @param prefix - Optional prefix to filter keys by
   * @returns Promise that resolves to an object with keys and their values
   */
  listKeys: (prefix?: string) => Promise<ListResult | null>
}
