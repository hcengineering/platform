//
// Copyright © 2022 Hardcore Engineering Inc.
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

/**
  Class that allows synchronization of async functions to prevent race conditions.
  Inspired by https://stackoverflow.com/a/51086893
**/
class Mutex {
  currentLock: Promise<void>

  constructor () {
    // initially the lock is not held
    this.currentLock = Promise.resolve()
  }

  /**
    Acquires the lock. Usage example:

    ```
    let mutex = new Mutex()

    async function synchronizedFunction() {
      const unlockMutex = await mutex.lock()
      try {
        // critical section
      } finally {
        unlockMutex()
      }
    }
    ```

    @return {Promise<VoidFunction>} promise that must be awaited in order to acquire the lock.
    When the promise is fulfulled it returns a function that must be invoked to release the lock.
  **/
  async lock (): Promise<VoidFunction> {
    // function which invocation releases the lock
    let releaseLock: VoidFunction
    // this Promise is fulfilled as soon as the function above is invoked
    const afterReleasePromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        resolve()
      }
    })
    // Caller gets a promise that resolves
    // only after the current outstanding lock resolves
    const blockingPromise = this.currentLock.then(() => releaseLock)
    // Don't allow the next request until the new promise is done
    this.currentLock = afterReleasePromise
    // Return the new promise
    return await blockingPromise
  }
}

type AnyFunction<R> = (...args: any[]) => Promise<R>
/**
  This function wraps around the Mutex implementation above and provides a simple interface.

  @return {Promise<VoidFunction>} a sequential version of the passed function. This version guarantees
  that its invocations are executed one by one.
**/
export function makeSequential<R, T extends AnyFunction<R>> (fn: T): (...args: Parameters<T>) => Promise<R> {
  const mutex = new Mutex()

  return async function (...args: Parameters<T>): Promise<R> {
    const unlockMutex = await mutex.lock()
    try {
      return await fn(...args)
    } finally {
      unlockMutex()
    }
  }
}
