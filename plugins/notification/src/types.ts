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
 * @public
 * Callback to inform of a value updates.
 */
export declare type Subscriber<T> = (value: T) => void

/**
 * @public
 * Unsubscribes from value updates. */
export declare type Unsubscriber = () => void

/**
 * @public
 * Callback to update a value.
 */
export declare type Updater<T> = (value: T) => T

/**
 * @public
 * Cleanup logic callback.
 */
export declare type Invalidator<T> = (value?: T) => void
/**
 * @public
 * Start and stop notification callbacks.
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export declare type StartStopNotifier<T> = (set: Subscriber<T>) => Unsubscriber | void

/**
 * @public
 * Readable interface for subscribing.
 */
export interface Readable<T> {
  /**
   * Subscribe on value changes.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  subscribe: (this: void, run: Subscriber<T>, invalidate?: Invalidator<T>) => Unsubscriber
}
/**
 * @public
 * Writable interface for both updating and subscribing.
 *
 */
export interface Writable<T> extends Readable<T> {
  /**
   * Set value and inform subscribers.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  set: (this: void, value: T) => void
  /**
   * Update value using callback and inform subscribers.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  update: (this: void, updater: Updater<T>) => void
}
