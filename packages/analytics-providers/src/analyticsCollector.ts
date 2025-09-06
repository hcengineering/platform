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

import { type AnalyticProvider } from '@hcengineering/analytics'
import presentation from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { AnalyticEventType } from '@hcengineering/analytics-collector'
import { collectEventMetadata, triggerUrlChange } from './utils'
import { type QueuedEvent } from './types'

export class AnalyticsCollectorProvider implements AnalyticProvider {
  private readonly collectIntervalMs = 5000
  private readonly maxRetries = 3
  private readonly maxBatchSize = 100
  private readonly maxBatchSizeBytes = 5 * 1024 * 1024 // 5MB
  private readonly events: QueuedEvent[] = []
  private collectTimer: any = null
  private url: string = ''
  private email: string | undefined = undefined
  private anonymousId: string = ''
  private isAuthenticated: boolean = false
  private data: Record<string, any> | null = null

  init (config: Record<string, any>): boolean {
    if (config.ANALYTICS_COLLECTOR_URL == null) return false
    this.url = config.ANALYTICS_COLLECTOR_URL
    if (this.url !== undefined && this.url !== '' && this.url !== null) {
      this.initializeAnonymousId()
      this.startCollectionTimer()
      return true
    }
    return false
  }

  private initializeAnonymousId (): void {
    this.anonymousId = this.generateAnonymousId()
  }

  private generateAnonymousId (): string {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
  }

  private startCollectionTimer (): void {
    if (this.collectTimer != null) clearInterval(this.collectTimer)
    this.collectTimer = setInterval(() => {
      void this.sendEvents()
    }, this.collectIntervalMs)
  }

  private stopCollectionTimer (): void {
    if (this.collectTimer != null) {
      clearInterval(this.collectTimer)
      this.collectTimer = null
    }
  }

  async sendEvents (): Promise<void> {
    if (this.events.length === 0) return

    const token = getMetadata(presentation.metadata.Token) ?? ''
    if (token === '') return

    const batches = this.createBatches(this.events)
    this.events.length = 0

    for (const batch of batches) {
      try {
        const response = await fetch(`${this.url}/collect`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        })

        if (!response.ok) {
          this.handleFailedEvents(batch)
        }
      } catch (err) {
        this.handleFailedEvents(batch)
      }
    }
  }

  private createBatches (events: QueuedEvent[]): QueuedEvent[][] {
    const batches: QueuedEvent[][] = []
    let currentBatch: QueuedEvent[] = []
    let currentBatchSize = 0

    for (const event of events) {
      const eventSize = JSON.stringify(event).length

      if (
        currentBatch.length >= this.maxBatchSize ||
        (currentBatchSize + eventSize > this.maxBatchSizeBytes && currentBatch.length > 0)
      ) {
        batches.push(currentBatch)
        currentBatch = []
        currentBatchSize = 0
      }

      currentBatch.push(event)
      currentBatchSize += eventSize
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    return batches
  }

  private handleFailedEvents (failedEvents: QueuedEvent[]): void {
    const eventsToRetry: QueuedEvent[] = []

    failedEvents.forEach((event) => {
      event.retryCount = (event.retryCount ?? 0) + 1
      if (event.retryCount <= this.maxRetries) {
        eventsToRetry.push(event)
      }
    })

    this.events.unshift(...eventsToRetry)
  }

  addEvent (
    eventType: AnalyticEventType,
    properties: Record<string, any> = {},
    eventName: string,
    overrideDistinctId?: string
  ): void {
    const currentId = overrideDistinctId ?? (this.isAuthenticated && this.email != null ? this.email : this.anonymousId)

    const baseProperties: Record<string, any> = {
      ...properties,
      analytics_collector: true,
      $anonymous_id: this.anonymousId,
      $is_identified: this.isAuthenticated
    }

    const eventMetadata: Record<string, any> = collectEventMetadata(baseProperties)
    if (eventType === AnalyticEventType.CustomEvent && (eventName !== '' || eventName != null)) {
      eventMetadata.event = eventName
    }
    if (this.data != null) {
      for (const key in this.data) {
        if (Object.prototype.hasOwnProperty.call(this.data, key)) {
          const value = this.data[key]
          eventMetadata[key] = value
        }
      }
    }

    const event: QueuedEvent = {
      event: eventType,
      properties: eventMetadata,
      timestamp: Date.now(),
      distinct_id: currentId
    }
    this.events.push(event)
  }

  private normalizeUserData (data: Record<string, any>): Record<string, any> {
    const cleanedData: Record<string, any> = {}
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key]
        if (Array.isArray(value)) {
          cleanedData[key] = value.join(', ')
        } else {
          cleanedData[key] = value
        }
      }
    }
    return cleanedData
  }

  setUser (email: string, data: Record<string, any>): void {
    const wasAuthenticated = this.isAuthenticated
    const previousId = this.anonymousId
    const normalizedData = this.normalizeUserData(data)

    this.email = email
    this.data = normalizedData
    this.isAuthenticated = true

    if (!wasAuthenticated && (previousId != null || previousId !== '')) {
      this.addEvent(
        AnalyticEventType.SetAlias,
        {
          alias: previousId,
          distinct_id: email,
          previous_id: previousId,
          $anonymous_id: previousId
        },
        '$create_alias',
        previousId
      )
    }

    const setData: Record<string, any> = { email, ...normalizedData }
    this.addEvent(
      AnalyticEventType.SetUser,
      {
        $set: setData,
        $set_once: {
          initial_url: window.location.pathname,
          first_seen: new Date().toISOString()
        }
      },
      '$identify'
    )
  }

  setAlias (distinctId: string, alias: string): void {
    this.addEvent(
      AnalyticEventType.SetAlias,
      {
        alias,
        previous_id: distinctId
      },
      '$create_alias'
    )
  }

  setTag (key: string, value: string | number): void {
    this.addEvent(
      AnalyticEventType.SetTag,
      {
        $set: { [key]: value },
        $set_once: { initial_url: window.location.pathname }
      },
      '$set'
    )
  }

  setWorkspace (ws: string, guest: boolean): void {
    const prop: string = guest ? 'visited-workspace' : 'workspace'
    this.addEvent(
      AnalyticEventType.SetGroup,
      {
        $group_0: ws,
        $group_key: ws,
        $group_set: {
          name: ws,
          joined_at: new Date().toISOString()
        },
        $group_type: prop,
        $groups: { [prop]: ws }
      },
      '$groupidentify'
    )
  }

  handleEvent (event: string, params: Record<string, string>): void {
    this.addEvent(AnalyticEventType.CustomEvent, { event, ...params }, event)
  }

  handleError (error: Error): void {
    const currentId = this.isAuthenticated && (this.email != null || this.email !== '') ? this.email : this.anonymousId
    this.addEvent(
      AnalyticEventType.Error,
      {
        error_message: error.message ?? 'Unknown error',
        error_type: error.name ?? 'Error',
        error_stack: error.stack ?? ''
      },
      '$exception',
      currentId
    )
  }

  navigate (path: string): void {
    triggerUrlChange()
    this.addEvent(AnalyticEventType.Navigation, { path }, '$pageview')
  }

  logout (): void {
    void this.sendEvents()

    this.email = undefined
    this.isAuthenticated = false
    this.data = null

    this.anonymousId = this.generateAnonymousId()
  }

  destroy (): void {
    this.stopCollectionTimer()
    void this.sendEvents()
  }

  flush (): Promise<void> {
    return this.sendEvents()
  }
}
