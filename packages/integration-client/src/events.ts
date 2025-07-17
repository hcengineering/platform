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

export type EventCallback<T = any> = (data: T) => void

export interface EventEmitter {
  on: <T = any>(event: string, callback: EventCallback<T>) => () => void
  emit: <T = any>(event: string, data: T) => void
  off: (event: string, callback?: EventCallback) => void
  removeAllListeners: (event?: string) => void
}

export class IntegrationEventEmitter implements EventEmitter {
  private readonly listeners = new Map<string, Set<EventCallback>>()

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const eventListeners = this.listeners.get(event)
    if (eventListeners === undefined) {
      console.error(`Event '${event}' not found in listeners map`)
      return () => {}
    }
    eventListeners.add(callback)

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  emit<T = any>(event: string, data: T): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners === undefined) return

    // Convert to array to avoid issues if listeners are modified during iteration
    const callbacks = Array.from(eventListeners)

    callbacks.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error)
      }
    })
  }

  off (event: string, callback?: EventCallback): void {
    if (callback == null) {
      this.listeners.delete(event)
      return
    }

    const eventListeners = this.listeners.get(event)
    if (eventListeners !== undefined) {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  removeAllListeners (event?: string): void {
    if (event !== undefined) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  // Utility method to get listener count
  listenerCount (event: string): number {
    return this.listeners.get(event)?.size ?? 0
  }
}

const GlobalIntegrationEventBus = {
  instance: null as IntegrationEventEmitter | null,

  getInstance (): IntegrationEventEmitter {
    if (GlobalIntegrationEventBus.instance == null) {
      GlobalIntegrationEventBus.instance = new IntegrationEventEmitter()
    }
    return GlobalIntegrationEventBus.instance
  },

  resetInstance (): void {
    GlobalIntegrationEventBus.instance = null
  }
}

export const getIntegrationEventBus = (): IntegrationEventEmitter => {
  return GlobalIntegrationEventBus.getInstance()
}

export function onIntegrationEvent<T = any> (
  event: string,
  callback: (data: T) => void,
  filter?: (data: T) => boolean
): () => void {
  const eventBus = getIntegrationEventBus()

  return eventBus.on(event, (data: T) => {
    if (filter === undefined || filter(data)) {
      callback(data)
    }
  })
}
