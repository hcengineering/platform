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

import { type AnalyticProvider, Analytics } from '@hcengineering/analytics'
import { AnalyticsCollectorProvider } from './analyticsCollector'
import { PosthogAnalyticProvider } from './posthog'
import { SentryAnalyticProvider } from './sentry'
import { type AnalyticsConfig } from './types'

export * from './analyticsCollector'
export * from './posthog'
export * from './sentry'
export * from './utils'
export * from './types'

export function configureAnalyticsProviders (config: AnalyticsConfig): void {
  const providers: AnalyticProvider[] = [
    new AnalyticsCollectorProvider(),
    new SentryAnalyticProvider(),
    new PosthogAnalyticProvider()
  ]

  for (const provider of providers) {
    Analytics.init(provider, config)
  }
}
