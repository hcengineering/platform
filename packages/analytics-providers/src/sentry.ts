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
import * as Sentry from '@sentry/svelte'

export class SentryAnalyticProvider implements AnalyticProvider {
  navigate (path: string): void {}
  init (config: Record<string, any>): boolean {
    if (config.SENTRY_DSN !== undefined && config.SENTRY_DSN !== '') {
      Sentry.init({
        dsn: config.SENTRY_DSN,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false
          })
        ],

        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 1.0,

        tracePropagationTargets: [/^https:\/\/huly\.app/, /^https:\/\/app\.huly\.io/, /^https:\/\/account\.huly\.io/],

        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: 1.0
      })
      return true
    }
    return false
  }

  setUser (email: string): void {
    Sentry.setUser({ email })
  }

  setAlias (distinctId: string, alias: string): void {}

  logout (): void {
    Sentry.setUser(null)
  }

  setTag (key: string, value: string | number): void {
    Sentry.setTag(key, value)
  }

  setWorkspace (ws: string, guest: boolean): void {
    const prop: string = guest ? 'visited-workspace' : 'workspace'
    this.setTag(prop, ws)
  }

  handleEvent (event: string): void {
    // currently we don't need it, but maybe in future
    // Sentry.captureMessage(event, 'log')
  }

  handleError (error: Error): void {
    Sentry.captureException(error)
  }
}
