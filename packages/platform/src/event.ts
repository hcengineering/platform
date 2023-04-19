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
 */
export const PlatformEvent = 'platform-event'

/**
 * @public
 */
export type EventListener = (event: string, data: any) => Promise<void>

const eventListeners = new Map<string, EventListener[]>()

/**
 * @public
 * @param event -
 * @param listener -
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
 * @param event -
 * @param listener -
 */
export function removeEventListener (event: string, listener: EventListener): void {
  const listeners = eventListeners.get(event)
  if (listeners !== undefined) {
    listeners.splice(listeners.indexOf(listener), 1)
  }
}

/**
 * @public
 */
export async function broadcastEvent (event: string, data: any): Promise<void> {
  const listeners = eventListeners.get(event)
  if (listeners !== undefined) {
    const promises = listeners.map(async (listener) => await listener(event, data))
    return await (Promise.all(promises) as unknown as Promise<void>)
  }
}

/**
 * @public
 * @param status -
 * @returns
 */
export async function setPlatformStatus (status: Status): Promise<void> {
  if (status.severity === Severity.ERROR) {
    console.trace('Platform Error Status', status)
  }
  return await broadcastEvent(PlatformEvent, status)
}

/**
 * @public
 * @param status -
 * @param promise -
 * @returns
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
