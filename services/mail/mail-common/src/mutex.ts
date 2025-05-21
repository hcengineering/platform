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
import { Mutex } from 'async-mutex'

export class SyncMutex {
  // Mutex for protecting the locks map
  private readonly globalMutex = new Mutex()
  // Map of keys to their associated mutexes
  private readonly locks = new Map<string, Mutex>()
  // Map to track active lock count per key
  private readonly lockCounts = new Map<string, number>()

  /**
   * Acquires a lock for the specified key
   * @param key The key to lock on
   * @returns A function to release the lock
   */
  async lock (key: string): Promise<() => void> {
    // Acquire the global mutex to safely access the locks map
    return await this.globalMutex.runExclusive(async () => {
      // Get or create a mutex for this key
      let keyMutex = this.locks.get(key)
      if (keyMutex === undefined) {
        console.log('Create mutex')
        keyMutex = new Mutex()
        this.locks.set(key, keyMutex)
        this.lockCounts.set(key, 0)
      }
      const currentCount = this.lockCounts.get(key) ?? 0
      this.lockCounts.set(key, currentCount + 1)
    }).then(async () => {
      // Now acquire the key-specific mutex
      const keyMutex = this.locks.get(key)
      if (keyMutex === undefined) {
        throw new Error('Key mutex should be created in the previous step')
      }
      console.log('acquire mutex')
      const release = await keyMutex.acquire()

      // Return a custom release function that cleans up the mutex when released
      return () => {
        release()

        // Clean up the mutex from the map if it's no longer in use
        console.log('runExclusive release')
        void this.globalMutex.runExclusive(() => {
          console.log('release')
          const currentCount = this.lockCounts.get(key) ?? 0
          if (currentCount <= 1) {
            this.lockCounts.delete(key)
            this.locks.delete(key)
          } else {
            this.lockCounts.set(key, currentCount - 1)
          }
        })
      }
    })
  }

  size (): number {
    return this.locks.size
  }
}
