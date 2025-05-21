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

  async lock (key: string): Promise<() => void> {
    // Wait for any existing lock to be released
    const currentLock = this.locks.get(key)
    if (currentLock != null) {
      await currentLock
    }

    // Create a new lock
    let releaseFn!: () => void
    const newLock = new Promise<void>((resolve) => {
      releaseFn = resolve
    })

    // Store the lock
    this.locks.set(key, newLock)

    // Return the release function
    return () => {
      if (this.locks.get(key) === newLock) {
        this.locks.delete(key)
      }
      releaseFn()
    }
  }
}
