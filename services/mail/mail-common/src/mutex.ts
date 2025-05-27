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

interface LockRequest {
  promise: Promise<void>
  resolve: () => void
}
export class SyncMutex {
  // Queue of pending promises for each lock key
  private readonly locks = new Map<string, Array<LockRequest>>()

  async lock (key: string): Promise<() => void> {
    // Initialize queue if it doesn't exist
    if (!this.locks.has(key)) {
      this.locks.set(key, [])
    }

    const queue = this.locks.get(key) as Array<LockRequest>

    // Create a new lock request
    let releaseFn!: () => void
    let resolveLockAcquired!: () => void

    // This promise resolves when the lock is acquired
    const lockAcquired = new Promise<void>((resolve) => {
      resolveLockAcquired = resolve
    })

    // This promise resolves when the lock is released
    const lockReleased = new Promise<void>((resolve) => {
      releaseFn = () => {
        // Remove this lock from the queue
        const index = queue.findIndex((item) => item.promise === lockReleased)
        if (index !== -1) {
          queue.splice(index, 1)
        }

        // If there are more locks in the queue, resolve the next one
        if (queue.length > 0) {
          queue[0].resolve()
        }

        // If queue is empty, clean up
        if (queue.length === 0) {
          this.locks.delete(key)
        }

        resolve()
      }
    })

    // Add this lock to the queue
    queue.push({ promise: lockReleased, resolve: resolveLockAcquired })

    // If this is the first lock in the queue, resolve it immediately
    if (queue.length === 1) {
      resolveLockAcquired()
    }

    // Wait until this lock is acquired
    await lockAcquired

    // Return the release function
    return releaseFn
  }
}
