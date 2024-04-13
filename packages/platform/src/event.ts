//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Status, OK, unknownError, Severity } from './status'

/**
 * @public
 * @constant PlatformEvent
 * 
 * A constant that represents the platform event.
 */
export const PlatformEvent = 'platform-event'

/**
 * @public
 * @typedef EventListener
 * 
 * Represents an event listener. Takes an event and data and returns a promise that resolves to void.
 */
export type EventListener = (event: string, data: any) => Promise<void>

/**
 * @constant eventListeners
 * A map that stores event listeners for each event.
 */
const eventListeners = new Map<string, EventListener[]>()

/**
 * @public
 * @function addEventListener
 * 
 * Adds an event listener for a given event. If there are already listeners for the event, 
 * it adds the listener to the list. Otherwise, it creates a new list with the listener.
 * 
 * @param event - The event to add the listener for.
 * @param listener - The listener to add.
 */
export function addEventListener (event: string, listener: EventListener): void {
  const listeners = eventListeners.get(event)
  if (listeners !== undefined) {
    listeners.push(listener)
  } else {
    eventListeners.set(event, [listener])
  }
}

/**
 * @public
 * @function removeEventListener
 * 
 * Removes an event listener for a given event. If there are listeners for the event, 
 * it removes the listener from the list.
 * 
 * @param event - The event to remove the listener for.
 * @param listener - The listener to remove.
 */
export function removeEventListener (event: string, listener: EventListener): void {
  const listeners = eventListeners.get(event)
  if (listeners !== undefined) {
    listeners.splice(listeners.indexOf(listener), 1)
  }
}

/**
 * @public
 * @function broadcastEvent
 * 
 * Broadcasts an event to all its listeners with the given data. If there are listeners for the event, 
 * it calls each listener with the event and data.
 * 
 * @param event - The event to broadcast.
 * @param data - The data to broadcast with the event.
 */
export async function broadcastEvent (event: string, data: any): Promise<void> {
  const listeners = eventListeners.get(event)
  if (listeners !== undefined) {
    const promises = listeners.map(async (listener) => {
      await listener(event, data)
    })
    await (Promise.all(promises) as unknown as Promise<void>)
  }
}

/**
 * @public
 * @function setPlatformStatus
 * 
 * Sets the platform status and broadcasts a platform event with the status. 
 * If the status severity is ERROR, it also logs a trace of the status.
 * 
 * @param status - The status to set.
 */
export async function setPlatformStatus (status: Status): Promise<void> {
  if (status.severity === Severity.ERROR) {
    console.trace('Platform Error Status', status)
  }
  await broadcastEvent(PlatformEvent, status)
}

/**
 * @public
 * @function monitor
 * 
 * Monitors a promise with a status. Sets the platform status, waits for the promise, 
 * then updates the status based on the outcome. Logs and rethrows any errors.
 * 
 * @param status - The status to monitor the promise with.
 * @param promise - The promise to monitor.
 * @returns The result of the promise.
 */
export async function monitor<T> (status: Status, promise: Promise<T>): Promise<T> {
  void setPlatformStatus(status) // eslint-disable-line no-void
  try {
    const result = await promise
    void setPlatformStatus(OK) // eslint-disable-line no-void
    return result
  } catch (err) {
    void setPlatformStatus(unknownError(err)) // eslint-disable-line no-void
    console.error(err)
    throw err
  }
}
