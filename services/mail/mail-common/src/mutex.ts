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
export class SyncMutex {
  private readonly locks = new Map<string, Promise<void>>()
  private readonly globalLock = Promise.resolve()

  async lock (key: string): Promise<() => void> {
    let releaseFn!: () => void
    const newLock = new Promise<void>((resolve) => {
      releaseFn = resolve
    })

    // Use a closure to hold the update operation
    const updateLocksAndWait = async (): Promise<void> => {
      // Wait for exclusive access to the map
      await this.globalLock
      const previousLock = this.locks.get(key)
      this.locks.set(key, newLock)

      // Wait for any previous lock to complete
      if (previousLock != null) {
        await previousLock
      }
    }

    // Execute the lock operation
    await updateLocksAndWait()

    // Return the release function
    return () => {
      if (this.locks.get(key) === newLock) {
        this.locks.delete(key)
      }
      releaseFn()
    }
  }
}
