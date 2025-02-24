//
// Copyright © 2024 Hardcore Engineering Inc.
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
import presentation  from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { type AnalyticEvent, AnalyticEventType } from '@hcengineering/analytics-collector'

import { type Config } from '../platform'

export class AnalyticsCollectorProvider implements AnalyticProvider {
  private readonly collectIntervalMs =  5000

  private readonly events: AnalyticEvent[] = []

  private url: string = ''

  init(config: Config): boolean {
    this.url = config.ANALYTICS_COLLECTOR_URL
    if (this.url !== undefined && this.url !== '' && this.url !== null) {
      setInterval(() => {
        void this.sendEvents()
      }, this.collectIntervalMs)
      return true
    }
    return false
  }

  async sendEvents(): Promise<void> {
    const data = this.events.splice(0, this.events.length)

    if(data.length === 0) {
      return
    }

    const token = getMetadata(presentation.metadata.Token) ?? ''

    if (token === '') {
      return
    }

    try {
      await fetch(`${this.url}/collect`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
    }catch(err) {
      console.error('Failed to send events', err)
    }
  }

  setUser(email: string): void {
    this.events.push({
      event: AnalyticEventType.SetUser,
      params: { email },
      timestamp: Date.now()
    })
  }

  setTag(key: string, value: string): void {
    this.events.push({
      event: AnalyticEventType.SetTag,
      params: { key, value },
      timestamp: Date.now()
    })
  }

  setWorkspace(ws: string): void {
    this.setTag('workspace', ws)
  }

  handleEvent(event: string, params: Record<string, string>): void {
    this.events.push({
      event: AnalyticEventType.CustomEvent,
      params: { ...params, event },
      timestamp: Date.now()
    })
  }

  handleError(error: Error): void {
    this.events.push({
      event: AnalyticEventType.Error,
      params: { error },
      timestamp: Date.now()
    })
  }

  navigate(path: string): void {
    this.events.push({
      event: AnalyticEventType.Navigation,
      params: { path },
      timestamp: Date.now()
    })
  }

  logout(): void {}
}