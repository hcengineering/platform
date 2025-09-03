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

export class SingleFlight<T> {
  private readonly promises = new Map<string, Promise<T>>()

  /**
   * Execute the function for the given key, deduplicating concurrent calls.
   * Multiple calls with the same key will wait for the first one to complete.
   *
   * @param key - The deduplication key
   * @param fn - The function to execute
   * @returns Promise resolving to the function's result
   */
  async execute (key: string, fn: () => Promise<T>): Promise<T> {
    const current = this.promises.get(key)
    if (current !== undefined) {
      return await current
    }

    const promise = (async (): Promise<T> => {
      try {
        return await fn()
      } finally {
        this.promises.delete(key)
      }
    })()

    this.promises.set(key, promise)
    return await promise
  }
}
